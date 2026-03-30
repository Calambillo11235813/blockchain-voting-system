import { Injectable, BadRequestException, NotFoundException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../entities/event.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ApiResponse, createApiResponse } from 'src/common/interfaces/response.interface';
import { handleError } from 'src/common/helpers/function-helper';
import { CreateEventDto } from '../dto/event/create-event.dto';
import { UpdateEventDto } from '../dto/event/update-event.dto';
import { validateImage } from 'src/common/utils/image-validator.util';
import { Faculty } from '../entities/faculty.entity';

@Injectable()
export class EventService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(Faculty)
    private readonly facultyRepository: Repository<Faculty>
  ) { }

  async findAll(userId: string, paginationDto: PaginationDto): Promise<ApiResponse<Event[]>> {
    try {
      const {
        limit = 10,
        offset = 0,
        search = '',
        order = 'DESC',
        orderBy = 'created_at',
        page = 1
      } = paginationDto;

      const skip = page ? (page - 1) * limit : offset;

      const queryBuilder = this.eventRepository.createQueryBuilder('event')
        .leftJoinAndSelect('event.faculty', 'faculty')
        .leftJoinAndSelect('event.sections', 'sections')
        .where('event.is_active = true');

      if (search) {
        queryBuilder.andWhere(
          '(event.title ILIKE :search OR event.description ILIKE :search OR event.address ILIKE :search)',
          { search: `%${search}%` }
        );
      }

      queryBuilder
        .orderBy(`event.${orderBy}`, order)
        .skip(skip)
        .take(limit);

      const [events, total] = await queryBuilder.getManyAndCount();

      return createApiResponse(
        HttpStatus.OK,
        events,
        'Eventos obtenidos correctamente',
        undefined,
        { total, page: page || Math.floor(skip / limit) + 1, limit }
      );
    } catch (error) {
      throw handleError(error, {
        context: 'EventService.findAll',
        action: 'query',
        entityName: 'Event',
        additionalInfo: {
          message: 'Error al obtener eventos',
        },
      });
    }
  }

  async findOne(id: string, userId: string): Promise<ApiResponse<Event>> {
    try {
      const event = await this.eventRepository.createQueryBuilder('event')
        .leftJoinAndSelect('event.faculty', 'faculty')
        .leftJoinAndSelect('event.sections', 'sections')
        .leftJoinAndSelect('event.identityVerifications', 'identityVerifications')
        .where('event.id = :id', { id })
        .getOne();

      if (!event) {
        throw new NotFoundException(`Evento con ID ${id} no encontrado`);
      }

      return createApiResponse(HttpStatus.OK, event, 'Evento obtenido correctamente');
    } catch (error) {
      throw handleError(error, {
        context: 'EventService.findOne',
        action: 'query',
        entityName: 'Event',
        entityId: id,
        additionalInfo: {
          message: 'Error al obtener evento',
        },
      });
    }
  }

  async create(
    createEventDto: CreateEventDto & { faculty: Faculty }, files: {
      image_event?: Express.Multer.File[],
      image_section?: Express.Multer.File[]
    },
    userId: string
  ): Promise<ApiResponse<Event>> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { facultyId, ...eventDetails } = createEventDto;

      if (new Date(createEventDto.start_date) > new Date(createEventDto.end_date)) {
        throw new BadRequestException('La fecha de inicio no puede ser posterior a la fecha de fin');
      }

      // Procesar la imagen del evento
      const imageEventUrl = files.image_event?.length
        ? await this.processFile(files.image_event[0])
        : null;

      // Procesar la imagen de la sección
      const imageSectionUrl = files.image_section?.length
        ? await this.processFile(files.image_section[0])
        : null;

      const newEvent = this.eventRepository.create({
        ...eventDetails,
        image_event: imageEventUrl,
        image_section: imageSectionUrl,
      });

      const savedEvent = await this.eventRepository.save(newEvent);

      return createApiResponse(HttpStatus.CREATED, savedEvent, 'Evento creado correctamente');
    } catch (error) {
      throw handleError(error, {
        context: 'EventService.create',
        action: 'create',
        entityName: 'Event',
        additionalInfo: {
          dto: { ...createEventDto, file: undefined, facultyId: undefined },
          message: 'Error al crear evento',
        }
      });
    }
  }

  async patch(
    id: string,
    updateEventDto: UpdateEventDto,
    files: {
      image_event?: Express.Multer.File[],
      image_section?: Express.Multer.File[]
    },
    userId: string
  ): Promise<ApiResponse<Event>> {
    try {
      const findEvent = await this.eventRepository.findOne({
        where: {
          id
        },
        relations: ['faculty']
      });

      if (!findEvent) {
        throw new NotFoundException(`Evento con ID ${id} no encontrado`);
      }

      // Validación de fechas (mantenida igual)
      if (updateEventDto.start_date && updateEventDto.end_date) {
        if (new Date(updateEventDto.start_date) > new Date(updateEventDto.end_date)) {
          throw new BadRequestException('La fecha de inicio no puede ser posterior a la fecha de fin');
        }
      } else if (updateEventDto.start_date && !updateEventDto.end_date) {
        if (new Date(updateEventDto.start_date) > new Date(findEvent.end_date)) {
          throw new BadRequestException('La fecha de inicio no puede ser posterior a la fecha de fin');
        }
      } else if (!updateEventDto.start_date && updateEventDto.end_date) {
        if (new Date(findEvent.start_date) > new Date(updateEventDto.end_date)) {
          throw new BadRequestException('La fecha de inicio no puede ser posterior a la fecha de fin');
        }
      }

      // Manejo de facultyId opcional
      let faculty = undefined;

      if (updateEventDto.facultyId) {
        faculty = await this.facultyRepository.findOne({
          where: {
            id: updateEventDto.facultyId
          }
        });

        if (!faculty) {
          throw new BadRequestException(`Facultad con ID ${updateEventDto.facultyId} no encontrada o no pertenece a este inquilino`);
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { facultyId, ...eventDetails } = updateEventDto;

      // Procesar imagen del evento si está presente
      let imageEventUrl = null;
      if (files.image_event?.length) {
        imageEventUrl = await this.processFile(files.image_event[0]);
      }

      // Procesar imagen de la sección si está presente
      let imageSectionUrl = null;
      if (files.image_section?.length) {
        imageSectionUrl = await this.processFile(files.image_section[0]);
      }

      const oldValues = { ...findEvent };

      // Precargar entidad con cambios
      const event = await this.eventRepository.preload({
        id,
        ...eventDetails,
        ...(imageEventUrl ? { image_event: imageEventUrl } : {}),
        ...(imageSectionUrl ? { image_section: imageSectionUrl } : {}),
        ...(faculty ? { faculty } : {}),
        updated_at: new Date() // Considera usar toBoliviaTime() aquí
      });

      if (!event) {
        throw new NotFoundException(`Evento con ID ${id} no encontrado`);
      }

      await this.eventRepository.save(event);

      const findUpdatedEvent = await this.eventRepository.findOne({
        where: { id },
        relations: ['faculty', 'sections']
      });

      return createApiResponse(HttpStatus.OK, findUpdatedEvent, 'Evento actualizado correctamente');
    } catch (error) {
      throw handleError(error, {
        context: 'EventService.patch',
        action: 'update',
        entityName: 'Event',
        entityId: id,
        additionalInfo: {
          dto: updateEventDto,
          message: 'Error al actualizar evento',
        }
      });
    }
  }

  async remove(id: string, userId: string): Promise<ApiResponse<null>> {
    try {
      const event = await this.eventRepository.findOne({
        where: {
          id
        }
      });

      if (!event) {
        throw new NotFoundException(`Evento con ID ${id} no encontrado`);
      }

      const oldValues = { ...event };

      await this.eventRepository.update(id, {
        is_active: false,
        updated_at: new Date()
      });

      return createApiResponse(HttpStatus.OK, null, 'Evento desactivado correctamente');
    } catch (error) {
      throw handleError(error, {
        context: 'EventService.remove',
        action: 'soft-delete',
        entityName: 'Event',
        entityId: id,
        additionalInfo: {
          message: 'Error al desactivar evento',
        }
      });
    }
  }

  async findByFaculty(facultyId: string, userId: string, paginationDto: PaginationDto): Promise<ApiResponse<Event[]>> {
    try {
      const {
        limit = 10,
        offset = 0,
        order = 'DESC',
        orderBy = 'created_at',
        page = 1
      } = paginationDto;

      const skip = page ? (page - 1) * limit : offset;

      const queryBuilder = this.eventRepository.createQueryBuilder('event')
        .leftJoinAndSelect('event.sections', 'sections')
        .where('event.faculty.id = :facultyId', { facultyId })
        .andWhere('event.is_active = true');

      queryBuilder
        .orderBy(`event.${orderBy}`, order)
        .skip(skip)
        .take(limit);

      const [events, total] = await queryBuilder.getManyAndCount();

      return createApiResponse(
        HttpStatus.OK,
        events,
        'Eventos por facultad obtenidos correctamente',
        undefined,
        { total, page: page || Math.floor(skip / limit) + 1, limit }
      );
    } catch (error) {
      throw handleError(error, {
        context: 'EventService.findByFaculty',
        action: 'query',
        entityName: 'Event',
        additionalInfo: {
          facultyId,
          message: 'Error al obtener eventos por facultad',
        }
      });
    }
  }

  async getEventStatistics(userId: string): Promise<ApiResponse<any>> {
    try {
      const totalEvents = await this.eventRepository.count({
        where: { is_active: true }
      });

      const activeEvents = await this.eventRepository.count({
        where: {
          is_active: true,
          end_date: new Date() // Eventos activos (que no han terminado)
        }
      });

      const upcomingEvents = await this.eventRepository.count({
        where: {
          is_active: true,
          start_date: new Date() // Eventos próximos (que no han comenzado)
        }
      });

      // Consulta para eventos por mes (últimos 6 meses)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const eventsByMonth = await this.eventRepository.createQueryBuilder('event')
        .select("TO_CHAR(event.start_date, 'YYYY-MM') as month")
        .addSelect('COUNT(event.id)', 'count')
        .where('event.start_date >= :sixMonthsAgo', { sixMonthsAgo })
        .groupBy("TO_CHAR(event.start_date, 'YYYY-MM')")
        .orderBy("TO_CHAR(event.start_date, 'YYYY-MM')", 'ASC')
        .getRawMany();

      const statistics = {
        totalEvents,
        activeEvents,
        upcomingEvents,
        eventsByMonth
      };

      return createApiResponse(HttpStatus.OK, statistics, 'Estadísticas de eventos obtenidas correctamente');
    } catch (error) {
      throw handleError(error, {
        context: 'EventService.getEventStatistics',
        action: 'query',
        entityName: 'Event',
        additionalInfo: {
          userId,
          message: 'Error al obtener estadísticas de eventos',
        }
      });
    }
  }

  async findPublicEvents(paginationDto: PaginationDto & {
    startDate?: string;
    endDate?: string;
    facultyId?: string;
  }): Promise<ApiResponse<Event[]>> {
    try {
      const {
        limit = 10,
        offset = 0,
        search = '',
        order = 'DESC',
        orderBy = 'created_at',
        page = 1,
        startDate,
        endDate,
        facultyId
      } = paginationDto;

      const skip = page ? (page - 1) * limit : offset;

      const queryBuilder = this.eventRepository.createQueryBuilder('event')
        .leftJoinAndSelect('event.faculty', 'faculty')
        .leftJoinAndSelect('event.sections', 'sections')
        .where('event.is_active = true');

      // Filtro opcional por facultad
      if (facultyId) {
        queryBuilder.andWhere('event.facultyId = :facultyId', { facultyId });
      }

      // Filtrado por fechas si se proporcionan
      if (startDate) {
        queryBuilder.andWhere('event.start_date >= :startDate', {
          startDate: new Date(startDate)
        });
      }

      if (endDate) {
        queryBuilder.andWhere('event.end_date <= :endDate', {
          endDate: new Date(endDate)
        });
      }

      // Búsqueda por texto
      if (search) {
        queryBuilder.andWhere(
          '(event.title ILIKE :search OR event.description ILIKE :search OR event.address ILIKE :search)',
          { search: `%${search}%` }
        );
      }

      queryBuilder
        .orderBy(`event.${orderBy}`, order)
        .skip(skip)
        .take(limit);

      const [events, total] = await queryBuilder.getManyAndCount();

      return createApiResponse(
        HttpStatus.OK,
        events,
        'Eventos obtenidos correctamente',
        undefined,
        { total, page: page || Math.floor(skip / limit) + 1, limit }
      );
    } catch (error) {
      throw handleError(error, {
        context: 'EventService.findPublicEvents',
        action: 'query',
        entityName: 'Event',
        additionalInfo: {
          message: 'Error al obtener eventos públicos',
        }
      });
    }
  }

  async findPublicOne(id: string): Promise<ApiResponse<Event>> {
    try {
      const event = await this.eventRepository.createQueryBuilder('event')
        .leftJoinAndSelect('event.faculty', 'faculty')
        .leftJoinAndSelect('event.sections', 'sections')
        .where('event.id = :id', { id })
        .andWhere('event.is_active = true')
        .getOne();

      if (!event) {
        throw new NotFoundException(`Evento con ID ${id} no encontrado`);
      }

      return createApiResponse(HttpStatus.OK, event, 'Evento obtenido correctamente');
    } catch (error) {
      throw handleError(error, {
        context: 'EventService.findPublicOne',
        action: 'query',
        entityName: 'Event',
        entityId: id,
        additionalInfo: {
          message: 'Error al obtener evento público',
        },
      });
    }
  }


  /**
   * Procesa un archivo opcional en el servicio
   */
  private async processFile(file?: Express.Multer.File): Promise<string | null> {
    if (!file) return null;

    const { isValid, error } = await validateImage(file);
    if (!isValid) throw new BadRequestException(error);

    return null;
  }
}