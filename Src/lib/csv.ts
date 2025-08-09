export function parseCSV(text: string): Record<string, string>[] {
    // Простой CSV: первая строка — заголовки, разделитель — запятая/точка с запятой
    const sep = text.includes(';') && !text.includes(',') ? ';' : ','
    const lines = text.split(/\r?\n/).filter(Boolean)
    if (lines.length === 0) return []
    const headers = lines[0].split(sep).map(h => h.trim())
    return lines.slice(1).map(line => {
        const cells = line.split(sep)
        const row: Record<string, string> = {}
        headers.forEach((h, i) => (row[h] = (cells[i] ?? '').trim()))
        return row
    })
}