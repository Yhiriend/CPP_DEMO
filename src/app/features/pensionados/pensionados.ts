import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucidePlus } from '@lucide/angular';

import { Breadcrumb } from '../../shared/ui/breadcrumb/breadcrumb';
import { Table } from '../../shared/ui/table/table';
import { TableColumn } from '../../shared/ui/table/table.model';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { Pensionado } from './models/pensionado.model';
import { PensionadosService } from './pensionados.service';

@Component({
  selector: 'app-pensionados',
  imports: [Breadcrumb, Table, FormsModule, LucidePlus],
  templateUrl: './pensionados.html',
})
export class Pensionados {
  private readonly pensionadosService = inject(PensionadosService);
  private readonly toastService = inject(ToastService);

  protected readonly columns: TableColumn<Pensionado>[] = [
    { key: 'tipoDocumento', header: 'Tipo Doc.' },
    { key: 'numeroDocumento', header: 'Número Documento' },
    { key: 'nombresApellidos', header: 'Nombres y Apellidos' },
    { key: 'entidadPrincipal', header: 'Entidad Principal Asociada' },
    { key: 'estado', header: 'Estado' },
  ];

  private readonly pensionados = this.pensionadosService.getPensionados();

  protected documentoBusqueda = '';
  protected nombreBusqueda = '';
  private readonly appliedDocumento = signal('');
  private readonly appliedNombre = signal('');

  protected readonly filteredPensionados = computed(() => {
    const documento = this.appliedDocumento().trim().toLowerCase();
    const nombre = this.appliedNombre().trim().toLowerCase();

    return this.pensionados.filter((pensionado) => {
      const matchesDocumento = !documento || pensionado.numeroDocumento.toLowerCase().includes(documento);
      const matchesNombre = !nombre || pensionado.nombresApellidos.toLowerCase().includes(nombre);
      return matchesDocumento && matchesNombre;
    });
  });

  protected search(): void {
    this.appliedDocumento.set(this.documentoBusqueda);
    this.appliedNombre.set(this.nombreBusqueda);
  }

  protected crearPensionado(): void {
    this.toastService.show('Crear un nuevo pensionado estará disponible cuando el backend esté conectado.');
  }

  protected verDetalle(pensionado: Pensionado): void {
    this.toastService.show(`El detalle de ${pensionado.nombresApellidos} estará disponible próximamente.`);
  }
}
