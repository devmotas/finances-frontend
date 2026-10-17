import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BusyButtonComponent } from './busy-button.component';
import { BUSY_LABEL } from './busy-labels';

@Component({
  imports: [BusyButtonComponent],
  template: `
    <button
      type="button"
      [appBusyButton]="busy()"
      [busyLabel]="label"
      [disabled]="blocked()"
      (click)="clicks = clicks + 1"
    >
      Salvar
    </button>
  `,
})
class HostComponent {
  readonly busy = signal(false);
  readonly blocked = signal(false);
  readonly label = BUSY_LABEL.saving;
  clicks = 0;
}

describe('BusyButtonComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  function button(): HTMLButtonElement {
    return (fixture.nativeElement as HTMLElement).querySelector('button')!;
  }

  function visibleText(): string {
    return button().innerText.trim();
  }

  function setBusy(busy: boolean): void {
    fixture.componentInstance.busy.set(busy);
    fixture.detectChanges();
  }

  beforeEach(() => {
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('mostra o conteúdo original e fica habilitado quando ocioso', () => {
    expect(visibleText()).toBe('Salvar');
    expect(button().disabled).toBeFalse();
    expect(button().querySelector('.fin-spinner')).toBeNull();
  });

  it('durante a requisição mostra spinner e texto de progresso e fica desabilitado', () => {
    setBusy(true);

    expect(visibleText()).toBe(BUSY_LABEL.saving);
    expect(button().disabled).toBeTrue();
    expect(button().getAttribute('aria-busy')).toBe('true');
    expect(button().querySelector('.fin-spinner')).not.toBeNull();
  });

  it('ignora cliques enquanto está ocupado', () => {
    setBusy(true);
    button().click();

    expect(fixture.componentInstance.clicks).toBe(0);
  });

  it('volta ao estado original quando a requisição termina', () => {
    setBusy(true);
    setBusy(false);

    expect(visibleText()).toBe('Salvar');
    expect(button().disabled).toBeFalse();
  });

  it('respeita o disabled informado mesmo sem requisição', () => {
    fixture.componentInstance.blocked.set(true);
    fixture.detectChanges();

    expect(button().disabled).toBeTrue();
    expect(visibleText()).toBe('Salvar');
  });
});
