const dateFmt = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const dateTimeFmt = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function formatDate(iso: string): string {
  try {
    return dateFmt.format(new Date(iso))
  } catch {
    return ''
  }
}

export function formatDateTime(iso: string): string {
  try {
    return dateTimeFmt.format(new Date(iso))
  } catch {
    return ''
  }
}
