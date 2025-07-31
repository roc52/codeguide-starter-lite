import { cn } from '@/lib/utils'

describe('cn utility', () => {
  it('should concatenate class names', () => {
    expect(cn('p-4', 'text-center')).toBe('p-4 text-center')
  })

  it('should handle conditional classes', () => {
    const condition = true
    const className = cn('p-2', condition && 'bg-red-500')
    expect(className).toContain('p-2')
    if (condition) {
      expect(className).toContain('bg-red-500')
    }
  })
})
