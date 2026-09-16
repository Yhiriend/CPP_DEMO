export interface DtfRate {
  readonly codigo: string;
  readonly periodo: string;
  readonly vigenciaInicial: string;
  readonly tasa: string;
  readonly tasaValor: number;
  readonly fechaRegistro: string;
  readonly usuarioResponsable: string;
}

export interface DtfRateFormValue {
  readonly tasa: number;
  readonly vigenciaInicial: string;
}
