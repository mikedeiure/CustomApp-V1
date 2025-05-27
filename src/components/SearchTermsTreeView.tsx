'use client'

import { useMemo } from 'react'
import { Building2, Users, Search } from 'lucide-react'
import type { CalculatedSearchTermMetric } from '@/lib/metrics'

interface TreeNode {
  id: string
  name: string
  type: 'campaign' | 'adGroup' | 'searchTerm'
  data?: CalculatedSearchTermMetric
  children: TreeNode[]
  x: number
  y: number
  depth: number
}

interface SearchTermsTreeViewProps {
  data: CalculatedSearchTermMetric[]
  currency: string
}

export function SearchTermsTreeView({ data, currency }: SearchTermsTreeViewProps) {
  // Build tree structure from flat data
  const treeData = useMemo(() => {
    const campaignMap = new Map<string, TreeNode>()
    
    data.forEach(term => {
      // Get or create campaign node
      if (!campaignMap.has(term.campaign)) {
        campaignMap.set(term.campaign, {
          id: `campaign-${term.campaign}`,
          name: term.campaign,
          type: 'campaign',
          children: [],
          x: 0,
          y: 0,
          depth: 0
        })
      }
      
      const campaignNode = campaignMap.get(term.campaign)!
      
      // Get or create ad group node
      const adGroupId = `adgroup-${term.campaign}-${term.ad_group}`
      let adGroupNode = campaignNode.children.find(child => child.id === adGroupId)
      
      if (!adGroupNode) {
        adGroupNode = {
          id: adGroupId,
          name: term.ad_group,
          type: 'adGroup',
          children: [],
          x: 0,
          y: 0,
          depth: 1
        }
        campaignNode.children.push(adGroupNode)
      }
      
      // Create search term node
      const searchTermNode: TreeNode = {
        id: `searchterm-${term.campaign}-${term.ad_group}-${term.search_term}`,
        name: term.search_term,
        type: 'searchTerm',
        data: term,
        children: [],
        x: 0,
        y: 0,
        depth: 2
      }
      
      adGroupNode.children.push(searchTermNode)
    })
    
    // Sort campaigns by name, ad groups by name, search terms by name
    const sortedCampaigns = Array.from(campaignMap.values()).sort((a, b) => a.name.localeCompare(b.name))
    
    sortedCampaigns.forEach(campaign => {
      campaign.children.sort((a, b) => a.name.localeCompare(b.name))
      campaign.children.forEach(adGroup => {
        adGroup.children.sort((a, b) => a.name.localeCompare(b.name))
      })
    })
    
    return sortedCampaigns
  }, [data])

  // Calculate positions for all nodes (fully expanded tree)
  const { allNodes, allLinks } = useMemo(() => {
    const nodes: TreeNode[] = []
    const links: { parent: TreeNode; child: TreeNode }[] = []
    let yPosition = 50

    const processNode = (node: TreeNode, depth: number, parent?: TreeNode): TreeNode => {
      const x = depth * 300 + 100 // More horizontal spacing
      const y = yPosition
      yPosition += 50 // Tighter vertical spacing

      const positionedNode: TreeNode = {
        ...node,
        x,
        y,
        depth
      }

      nodes.push(positionedNode)

      if (parent) {
        links.push({ parent, child: positionedNode })
      }

      // Always process all children (fully expanded)
      if (node.children.length > 0) {
        const childrenWithPositions = node.children.map(child => 
          processNode(child, depth + 1, positionedNode)
        )
        positionedNode.children = childrenWithPositions
      }

      return positionedNode
    }

    treeData.forEach(campaign => {
      processNode(campaign, 0)
    })

    return { allNodes: nodes, allLinks: links }
  }, [treeData])

  // Generate curved path between parent and child nodes (D3.js diagonal style)
  const generatePath = (parent: TreeNode, child: TreeNode) => {
    const x1 = parent.x
    const y1 = parent.y
    const x2 = child.x
    const y2 = child.y
    
    // Create smooth curve like D3.js diagonal
    const midX = (x1 + x2) / 2
    
    return `M${x1},${y1} C${midX},${y1} ${midX},${y2} ${x2},${y2}`
  }

  // Calculate SVG dimensions
  const maxX = Math.max(...allNodes.map(n => n.x + 250), 800)
  const maxY = Math.max(...allNodes.map(n => n.y + 30), 400)

  const getTotalCounts = () => {
    const totalCampaigns = treeData.length
    const totalAdGroups = treeData.reduce((sum, campaign) => sum + campaign.children.length, 0)
    const totalSearchTerms = data.length
    
    return { totalCampaigns, totalAdGroups, totalSearchTerms }
  }

  const { totalCampaigns, totalAdGroups, totalSearchTerms } = getTotalCounts()

  return (
    <div className="rounded-md border bg-white shadow-sm">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-4 border-b">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-gray-900 text-lg flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              Tree View
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {totalCampaigns} campaigns • {totalAdGroups} ad groups • {totalSearchTerms} search terms
            </p>
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="px-4 py-3 bg-gray-50 border-b flex items-center gap-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <Building2 className="h-3 w-3 text-blue-600" />
          <span className="text-gray-600">Campaigns</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <Users className="h-3 w-3 text-green-600" />
          <span className="text-gray-600">Ad Groups</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
          <Search className="h-3 w-3 text-gray-600" />
          <span className="text-gray-600">Search Terms</span>
        </div>
      </div>
      
      {/* Tree Visualization */}
      <div className="p-6 overflow-auto max-h-[700px] bg-white">
        {treeData.length > 0 ? (
          <svg width={maxX} height={maxY} className="font-sans">
            {/* Render connecting lines */}
            {allLinks.map((link, index) => (
              <path
                key={`link-${index}`}
                d={generatePath(link.parent, link.child)}
                fill="none"
                stroke="#d1d5db"
                strokeWidth="1.5"
                strokeOpacity="0.8"
              />
            ))}
            
            {/* Render nodes */}
            {allNodes.map((node) => {
              const textColor = node.type === 'campaign' ? '#1e40af' : 
                              node.type === 'adGroup' ? '#047857' : '#374151'
              const fontSize = node.type === 'campaign' ? '14' : 
                             node.type === 'adGroup' ? '12' : '11'
              const fontWeight = node.type === 'campaign' ? '600' : 
                               node.type === 'adGroup' ? '500' : 'normal'
              
              return (
                <g key={node.id}>
                  {/* Small circle at node position */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r="3"
                    fill={node.type === 'campaign' ? '#3b82f6' : 
                          node.type === 'adGroup' ? '#10b981' : '#6b7280'}
                  />
                  
                  {/* Node label */}
                  <text
                    x={node.x + 8}
                    y={node.y + 4}
                    fontSize={fontSize}
                    fontWeight={fontWeight}
                    fill={textColor}
                    className="select-none"
                  >
                    {node.name.length > 35 ? `${node.name.substring(0, 35)}...` : node.name}
                  </text>
                </g>
              )
            })}
          </svg>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <div className="text-lg font-medium">No search terms found</div>
            <p className="text-sm mt-1">Try adjusting your filters to see data</p>
          </div>
        )}
      </div>
    </div>
  )
} 