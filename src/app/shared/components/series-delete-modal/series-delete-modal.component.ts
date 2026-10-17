import { Component, ElementRef, HostListener, effect, inject, input, output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

export interface SeriesDeleteChoice {
  readonly applyToFutureSeries: boolean;
}

/**
 * Confirmação de exclusão de lançamento.
 * - Série fixa: "Só este mês", "Este e os próximos" ou "Cancelar".
 * - Lançamento avulso: "Excluir" ou "Cancelar".
 * Cancelar, Esc e clique fora apenas emitem `cancelled` (nenhuma exclusão).
 */
@Component({
  selector: 'app-series-delete-modal',
  imports: [LucideAngularModule],
  templateUrl: './series-delete-modal.component.html',
  styleUrl: './series-delete-modal.component.scss',
})
export class SeriesDeleteModalComponent {
  private readonly el = inject(ElementRef);

  readonly visible = input(false);
  /** Quando true, mostra as opções de série (só este mês / este e os próximos). */
  readonly isSeries = input(false);
  /** Ex.: "esta saída", "este aporte". */
  readonly itemLabel = input('este lançamento');

  readonly confirmed = output<SeriesDeleteChoice>();
  readonly cancelled = output<void>();

  constructor() {
    effect(() => {
      if (this.visible()) {
        setTimeout(() =>
          (this.el.nativeElement as HTMLElement)
            .querySelector<HTMLButtonElement>('[data-autofocus]')
            ?.focus()
        );
      }
    });
  }

  @HostListener('document:keydown', ['$event'])
  onDocKey(e: KeyboardEvent): void {
    if (e.key === 'Escape' && this.visible()) this.cancel();
  }

  backdropClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('modal__backdrop')) {
      this.cancel();
    }
  }

  cancel(): void {
    this.cancelled.emit();
  }

  deleteOnlyThis(): void {
    this.confirmed.emit({ applyToFutureSeries: false });
  }

  deleteThisAndNext(): void {
    this.confirmed.emit({ applyToFutureSeries: true });
  }
}
