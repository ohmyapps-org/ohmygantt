export type CalendarPreset = {
  country: string
  name: string
  holidays: Array<{ month: number; day: number; name: string }>
  weekendDays: number[]
}

export const CALENDAR_PRESETS: CalendarPreset[] = [
  {
    country: 'uy',
    name: 'Uruguay',
    weekendDays: [0, 6],
    holidays: [
      { month: 1,  day: 1,  name: 'Año Nuevo' },
      { month: 1,  day: 6,  name: 'Reyes Magos' },
      { month: 4,  day: 19, name: 'Desembarco de los 33 Orientales' },
      { month: 5,  day: 1,  name: 'Día del Trabajador' },
      { month: 5,  day: 18, name: 'Batalla de Las Piedras' },
      { month: 6,  day: 19, name: 'Natalicio de Artigas' },
      { month: 7,  day: 18, name: 'Jura de la Constitución' },
      { month: 8,  day: 25, name: 'Declaratoria de la Independencia' },
      { month: 10, day: 12, name: 'Día de la Raza' },
      { month: 11, day: 2,  name: 'Día de los Difuntos' },
      { month: 12, day: 25, name: 'Navidad' },
    ],
  },
  {
    country: 'ar',
    name: 'Argentina',
    weekendDays: [0, 6],
    holidays: [
      { month: 1,  day: 1,  name: 'Año Nuevo' },
      { month: 3,  day: 24, name: 'Día de la Memoria' },
      { month: 4,  day: 2,  name: 'Malvinas' },
      { month: 5,  day: 1,  name: 'Día del Trabajador' },
      { month: 5,  day: 25, name: 'Revolución de Mayo' },
      { month: 6,  day: 17, name: 'Paso a la Inmortalidad de Güemes' },
      { month: 6,  day: 20, name: 'Paso a la Inmortalidad de Belgrano' },
      { month: 7,  day: 9,  name: 'Día de la Independencia' },
      { month: 8,  day: 17, name: 'Paso a la Inmortalidad de San Martín' },
      { month: 10, day: 12, name: 'Diversidad Cultural' },
      { month: 11, day: 20, name: 'Soberanía Nacional' },
      { month: 12, day: 8,  name: 'Inmaculada Concepción' },
      { month: 12, day: 25, name: 'Navidad' },
    ],
  },
  {
    country: 'us',
    name: 'United States',
    weekendDays: [0, 6],
    holidays: [
      { month: 1,  day: 1,  name: "New Year's Day" },
      { month: 6,  day: 19, name: 'Juneteenth' },
      { month: 7,  day: 4,  name: 'Independence Day' },
      { month: 11, day: 11, name: 'Veterans Day' },
      { month: 12, day: 25, name: 'Christmas Day' },
    ],
  },
  {
    country: 'es',
    name: 'Spain',
    weekendDays: [0, 6],
    holidays: [
      { month: 1,  day: 1,  name: 'Año Nuevo' },
      { month: 1,  day: 6,  name: 'Epifanía' },
      { month: 5,  day: 1,  name: 'Fiesta del Trabajo' },
      { month: 8,  day: 15, name: 'Asunción de la Virgen' },
      { month: 10, day: 12, name: 'Fiesta Nacional' },
      { month: 11, day: 1,  name: 'Todos los Santos' },
      { month: 12, day: 6,  name: 'Día de la Constitución' },
      { month: 12, day: 8,  name: 'Inmaculada Concepción' },
      { month: 12, day: 25, name: 'Navidad' },
    ],
  },
  {
    country: 'br',
    name: 'Brazil',
    weekendDays: [0, 6],
    holidays: [
      { month: 1,  day: 1,  name: 'Confraternização Universal' },
      { month: 4,  day: 21, name: 'Tiradentes' },
      { month: 5,  day: 1,  name: 'Dia do Trabalhador' },
      { month: 9,  day: 7,  name: 'Independência do Brasil' },
      { month: 10, day: 12, name: 'Nossa Senhora Aparecida' },
      { month: 11, day: 2,  name: 'Finados' },
      { month: 11, day: 15, name: 'Proclamação da República' },
      { month: 12, day: 25, name: 'Natal' },
    ],
  },
  {
    country: 'mx',
    name: 'Mexico',
    weekendDays: [0, 6],
    holidays: [
      { month: 1,  day: 1,  name: 'Año Nuevo' },
      { month: 2,  day: 5,  name: 'Día de la Constitución' },
      { month: 3,  day: 21, name: 'Natalicio de Benito Juárez' },
      { month: 5,  day: 1,  name: 'Día del Trabajo' },
      { month: 9,  day: 16, name: 'Día de la Independencia' },
      { month: 11, day: 20, name: 'Revolución Mexicana' },
      { month: 12, day: 25, name: 'Navidad' },
    ],
  },
]

export function getPreset(country: string): CalendarPreset | undefined {
  return CALENDAR_PRESETS.find((p) => p.country === country)
}
