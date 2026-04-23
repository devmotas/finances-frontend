import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Category, CategoryCreateDto } from '../models/finances.models';
import { CategoryApiDto, mapCategoryApiDto } from '../utils/api-mappers';

@Injectable({ providedIn: 'root' })
export class CategoryApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/categories';

  getAll(): Observable<Category[]> {
    return this.http
      .get<CategoryApiDto[]>(this.base)
      .pipe(map((rows) => rows.map(mapCategoryApiDto)));
  }

  create(dto: CategoryCreateDto): Observable<Category> {
    return this.http.post<CategoryApiDto>(this.base, dto).pipe(map(mapCategoryApiDto));
  }

  update(id: number, dto: CategoryCreateDto): Observable<Category> {
    return this.http.put<CategoryApiDto>(`${this.base}/${id}`, dto).pipe(map(mapCategoryApiDto));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
