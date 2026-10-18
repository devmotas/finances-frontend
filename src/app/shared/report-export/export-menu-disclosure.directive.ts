import { Directive, ElementRef, contentChild, inject, input } from '@angular/core';
import { ReportExport } from './report-export';

@Directive({
  selector: '[appExportMenuDisclosure]',
  host: {
    '(keydown.escape)': 'closeAndRestoreFocus()',
    '(focusout)': 'closeWhenFocusLeaves($event)',
    '(document:click)': 'closeOnOutsideClick($event)',
  },
})
export class ExportMenuDisclosureDirective {
  readonly reportExport = input.required<ReportExport>({ alias: 'appExportMenuDisclosure' });
  private readonly trigger = contentChild.required<string, ElementRef<HTMLElement>>('exportTrigger', {
    read: ElementRef,
  });
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  closeAndRestoreFocus(): void {
    if (!this.reportExport().isMenuOpen()) return;
    this.reportExport().closeMenu();
    this.trigger().nativeElement.focus();
  }

  closeWhenFocusLeaves(event: FocusEvent): void {
    const next = event.relatedTarget;
    if (next instanceof Node && !this.contains(next)) this.reportExport().closeMenu();
  }

  closeOnOutsideClick(event: MouseEvent): void {
    const target = event.target;
    if (target instanceof Node && this.contains(target)) return;
    this.reportExport().closeMenu();
  }

  private contains(node: Node): boolean {
    return this.host.nativeElement.contains(node);
  }
}
