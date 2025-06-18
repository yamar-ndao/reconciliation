import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DataNormalizationService {
  private readonly columnHeaders = new Set([
    'Agence',
    'Agency',
    'Service',
    'Date',
    'Volume',
    'Total'
  ]);

  normalizeColumnHeader(header: string): string {
    if (this.columnHeaders.has(header)) {
      return header;
    }
    const normalizedHeader = header.trim().toUpperCase();
    const headerMapping: { [key: string]: string } = {
      'AGENCE': 'Agence',
      'AGENCY': 'Agence',
      'SERVICE': 'Service',
      'DATE': 'Date',
      'VOLUME': 'Volume',
      'TOTAL': 'Total'
    };
    return headerMapping[normalizedHeader] || header;
  }

  normalizeData(data: any[]): any[] {
    return data.map(item => {
      const normalizedItem: any = {};
      Object.keys(item).forEach(key => {
        const normalizedKey = this.normalizeColumnHeader(key.trim());
        let value = item[key];
        normalizedItem[normalizedKey] = value;
      });
      return normalizedItem;
    });
  }
} 