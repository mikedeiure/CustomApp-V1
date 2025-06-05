'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Settings } from 'lucide-react'


export function Navigation() {
    const pathname = usePathname()

    return (
        <nav className="fixed top-0 z-50 w-full border-b bg-white">
            <div className="container mx-auto px-4 h-16 flex items-center">
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center space-x-6">
                        <Link href="/" className="flex items-center space-x-3">
                            <Image
                                src="/RPM logo.png"
                                alt="Rock Power Marketing"
                                width={288}
                                height={108}
                                className="h-16 w-auto"
                            />
                            <span className="font-bold text-gray-700">
                                Google Campaign Stats
                            </span>
                        </Link>
                        <Link
                            href="/terms"
                            className={cn(
                                "text-sm font-medium transition-colors hover:text-foreground/80",
                                pathname === "/terms" ? "text-foreground" : "text-foreground/60"
                            )}
                        >
                            Search Terms
                        </Link>
                        <Link
                            href="/ad-group-analyzer"
                            className={cn(
                                "text-sm font-medium transition-colors hover:text-foreground/80",
                                pathname === "/ad-group-analyzer" ? "text-foreground" : "text-foreground/60"
                            )}
                        >
                            Ad Group Analyzer
                        </Link>
                        <Link
                            href="/data-insights"
                            className={cn(
                                "text-sm font-medium transition-colors hover:text-foreground/80",
                                pathname === "/data-insights" ? "text-foreground" : "text-foreground/60"
                            )}
                        >
                            Data Insights
                        </Link>
                    </div>
                    <Link
                        href="/settings"
                        className={cn(
                            "transition-colors hover:text-foreground/80",
                            pathname === "/settings" ? "text-foreground" : "text-foreground/60"
                        )}
                    >
                        <Settings size={20} />
                    </Link>
                </div>
            </div>
        </nav>
    )
} 