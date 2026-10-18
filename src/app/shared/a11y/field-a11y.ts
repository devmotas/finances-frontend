import { AbstractControl } from '@angular/forms';

type DescriptionId = string | false | null | undefined;

const ID_SEPARATOR = ' ';

export function describedBy(...ids: DescriptionId[]): string | null {
  const present = ids.filter((id): id is string => !!id);
  return present.length ? present.join(ID_SEPARATOR) : null;
}

export function isInvalid(control: AbstractControl): boolean {
  return control.touched && control.invalid;
}
