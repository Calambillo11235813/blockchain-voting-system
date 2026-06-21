import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { validate as validateUuid } from 'uuid';
import { VOTO_BLANCO_ID } from '../../constants/voto-blanco.constant';

@ValidatorConstraint({ name: 'isUuidOrVotoBlanco', async: false })
export class IsUuidOrVotoBlancoConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string' || value.trim() === '') {
      return false;
    }

    if (value === VOTO_BLANCO_ID) {
      return true;
    }

    return validateUuid(value);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} debe ser un UUID válido o el valor exacto "${VOTO_BLANCO_ID}".`;
  }
}

/**
 * Permite UUID v4 o el literal "BLANCO" para votos en blanco.
 */
export function IsUuidOrVotoBlanco(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsUuidOrVotoBlancoConstraint,
    });
  };
}
