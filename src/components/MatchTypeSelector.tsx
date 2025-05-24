'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronDown, Target } from 'lucide-react'
import { getMatchTypeDisplayName, type MatchType } from '@/lib/export'

interface MatchTypeSelectorProps {
  value: MatchType
  onChange: (matchType: MatchType) => void
}

export function MatchTypeSelector({ value, onChange }: MatchTypeSelectorProps) {
  const matchTypes: MatchType[] = ['broad', 'phrase', 'exact']

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-gray-700">Match Type:</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="min-w-[140px] justify-between">
            <div className="flex items-center">
              <Target className="h-4 w-4 mr-2" />
              {getMatchTypeDisplayName(value)}
            </div>
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          {matchTypes.map((matchType) => (
            <DropdownMenuItem 
              key={matchType}
              onClick={() => onChange(matchType)}
              className={value === matchType ? 'bg-accent' : ''}
            >
              <span className="font-medium">{getMatchTypeDisplayName(matchType)}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
} 