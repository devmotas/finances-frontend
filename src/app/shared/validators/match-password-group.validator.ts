import { AbstractControl, FormGroup, ValidationErrors, ValidatorFn } from '@angular/forms';

export function matchPasswordGroupValidator(passwordKey: string, confirmKey: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const fg = group as FormGroup;
    const a = fg.get(passwordKey)?.value;
    const b = fg.get(confirmKey)?.value;
    if (a == null || b == null || a === '' || b === '') {
      return null;
    }
    return a === b ? null : { passwordMismatch: true };
  };
}
