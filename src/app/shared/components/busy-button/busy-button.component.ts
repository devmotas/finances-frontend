import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'button[appBusyButton]',
  templateUrl: './busy-button.component.html',
  styleUrl: './busy-button.component.scss',
  host: {
    '[disabled]': 'isDisabled()',
    '[attr.aria-busy]': 'busy()',
  },
})
export class BusyButtonComponent {
  readonly busy = input(false, { alias: 'appBusyButton' });
  readonly busyLabel = input.required<string>();
  readonly disabled = input(false);

  readonly isDisabled = computed(() => this.busy() || this.disabled());
}
