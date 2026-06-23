import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { esUuidLike } from './uuid-like.util';

@ValidatorConstraint({ name: 'isUuidLike', async: false })
export class IsUuidLikeConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return esUuidLike(value);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} debe ser un UUID válido.`;
  }
}

export function IsUuidLike(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsUuidLikeConstraint,
    });
  };
}
