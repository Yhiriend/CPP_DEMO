import { Directive, ElementRef, HostListener, forwardRef, inject } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Formatea un `<input type="text">` como pesos colombianos (separador de miles) mientras se escribe,
 * manteniendo el valor del [(ngModel)] como un `number | null` puro (sin comas). Uso:
 * `<input type="text" inputmode="numeric" appMoneyInput [(ngModel)]="formValor" />`.
 */
@Directive({
  selector: 'input[appMoneyInput]',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MoneyInputDirective),
      multi: true,
    },
  ],
})
export class MoneyInputDirective implements ControlValueAccessor {
  private readonly elementRef = inject(ElementRef<HTMLInputElement>);

  private onChange: (value: number | null) => void = () => {};
  private onTouched: () => void = () => {};

  @HostListener('input', ['$event'])
  protected onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const cursorFromEnd = input.value.length - (input.selectionStart ?? input.value.length);

    const digitos = input.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
    const valor = digitos ? Number(digitos) : null;
    const formateado = digitos ? Number(digitos).toLocaleString('en-US') : '';

    input.value = formateado;
    const nuevaPosicion = Math.max(0, formateado.length - cursorFromEnd);
    input.setSelectionRange(nuevaPosicion, nuevaPosicion);

    this.onChange(valor);
  }

  @HostListener('blur')
  protected onBlur(): void {
    this.onTouched();
  }

  writeValue(value: number | null): void {
    this.elementRef.nativeElement.value = value || value === 0 ? value.toLocaleString('en-US') : '';
  }

  registerOnChange(fn: (value: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
}
