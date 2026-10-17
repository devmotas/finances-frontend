import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LucideAngularModule } from 'lucide-angular';
import { APP_LUCIDE_ICONS } from '../../../core/icons/app-lucide-icons';
import { SeriesDeleteModalComponent } from './series-delete-modal.component';
import { SERIES_DELETE_SCOPE, SeriesDeleteScope } from './series-delete-scope';

describe('SeriesDeleteModalComponent', () => {
  let fixture: ComponentFixture<SeriesDeleteModalComponent>;
  let confirmed: SeriesDeleteScope[];
  let cancelled: number;

  function setup(isSeries: boolean): void {
    fixture = TestBed.createComponent(SeriesDeleteModalComponent);
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('isSeries', isSeries);
    fixture.componentRef.setInput('itemLabel', 'esta saída');
    confirmed = [];
    cancelled = 0;
    fixture.componentInstance.confirmed.subscribe((c) => confirmed.push(c));
    fixture.componentInstance.cancelled.subscribe(() => cancelled++);
    fixture.detectChanges();
  }

  function button(label: string): HTMLButtonElement {
    const buttons = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.modal__actions button')
    );
    const found = buttons.find((b) => b.textContent?.trim() === label);
    if (!found) throw new Error(`Botão "${label}" não encontrado`);
    return found;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeriesDeleteModalComponent, LucideAngularModule.pick(APP_LUCIDE_ICONS)],
    }).compileComponents();
  });

  it('mostra as três opções para lançamento de série', () => {
    setup(true);
    expect(button('Cancelar')).toBeTruthy();
    expect(button('Só este mês')).toBeTruthy();
    expect(button('Este e os próximos')).toBeTruthy();
  });

  it('Cancelar não emite exclusão', () => {
    setup(true);
    button('Cancelar').click();
    expect(confirmed).toEqual([]);
    expect(cancelled).toBe(1);
  });

  it('Esc e clique no fundo não emitem exclusão', () => {
    setup(true);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.modal__backdrop')!.click();
    expect(confirmed).toEqual([]);
    expect(cancelled).toBe(2);
  });

  it('"Só este mês" exclui sem afetar os próximos', () => {
    setup(true);
    button('Só este mês').click();
    expect(confirmed).toEqual([SERIES_DELETE_SCOPE.thisMonth]);
  });

  it('"Este e os próximos" exclui a partir deste mês', () => {
    setup(true);
    button('Este e os próximos').click();
    expect(confirmed).toEqual([SERIES_DELETE_SCOPE.thisAndFuture]);
  });

  it('lançamento avulso mostra apenas Excluir e Cancelar', () => {
    setup(false);
    const labels = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.modal__actions button')
    ).map((b) => b.textContent?.trim());
    expect(labels).toEqual(['Cancelar', 'Excluir']);
    button('Excluir').click();
    expect(confirmed).toEqual([SERIES_DELETE_SCOPE.thisMonth]);
  });

  it('durante a exclusão desabilita as ações e não permite cancelar', () => {
    setup(true);
    fixture.componentRef.setInput('deletingScope', SERIES_DELETE_SCOPE.thisAndFuture);
    fixture.detectChanges();

    const buttons = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.modal__actions button')
    );
    expect(buttons.every((b) => b.disabled)).toBeTrue();
    expect(buttons[2].getAttribute('aria-busy')).toBe('true');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(cancelled).toBe(0);
  });
});
