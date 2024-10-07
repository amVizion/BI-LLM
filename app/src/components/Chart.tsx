/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Cell,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  Scatter,
  ScatterChart,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts'
  
import { iCluster, iItem } from '../utils/types'
import { numberFormater } from '../utils/utils'
import { useEffect, useState } from 'react'
import { iAction } from '../views/Items'
  
const CHART_MARGIN = { top:20, right:20, bottom:20, left:20 }
const TOOLTIP_STYLE = {backgroundColor:'white', padding:12, borderColor: '1px solid #f5f5f5', color:'black'}
const CustomTooltip = ({ active, payload }: any) => active && <div style={TOOLTIP_STYLE}>
    <strong style={{color:'black'}}> {payload[0].payload.title} </strong>
    <p> { payload[0].payload.outputKey }: {numberFormater(payload[0].payload.target)} </p>
    { payload[0].payload.size && <p> Size: {payload[0].payload.size} </p> }
</div>
  
const computeColor = (items:iItem[]):iColoredItem[] => {
  const outputs = items.map(({ output }) => output)

  const maxOutput = Math.log(Math.max(...outputs))
  const minOutput = Math.log(Math.min(...outputs))

  const coloredItems = items.map(i => {
    const { output:o } = i
    const value = Math.round(255 * (Math.log(o) - minOutput) / (maxOutput - minOutput))
    return {...i , color: `rgb(${255-value}, ${value}, 0)`}
  })

  return coloredItems
}

interface iClusterChart { 
  outputKey?: string
  data: iItem[]
  clusters?: iCluster[]
  setAction?(action: iAction):void
}

interface iColoredItem extends iItem { color:string }

const COLORS = [
  '#5ad8b5',
  '#fff1a8',
  '#3884ec',
  '#8595a5',
  '#e54cb1'
]


export const Chart = ({ data, outputKey, clusters, setAction }: iClusterChart) => {
  const [items, setItems] = useState<iColoredItem[]>()

  // If items are iItems then compute color.
  useEffect(() => {
      const coloredItems = computeColor(data as iItem[])
      return setItems(coloredItems)

  }, [data])

  return <ResponsiveContainer width='100%' height={400}>
    <ScatterChart margin={CHART_MARGIN}>
      <CartesianGrid />
      <XAxis type='number' dataKey='x' />
      <YAxis type='number' dataKey='y' />
      <ZAxis type='number' dataKey='z' range={[60, 200]} name='items'/> { /* TODO: Fix for clusters */ }
      <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip/>} />

      { items && <Scatter 
        name='Items' 
        data={
          items.map(i => ({ 
            title: i.text,
            x: Math.round(i.center[0]*1000)/1000, 
            y: Math.round(i.center[1]*1000)/1000,             
            z: 200,
            target: i.output,
            outputKey, 
          }))
        }
      >
        { 
          items.map((i, k) => 
            <Cell 
              id={`${k}`}
              key={`cell-${k}`} 
              fill={i.text === 'Anna Stepura: AI for Business' ? 'white'
                : !clusters ? i.color : COLORS[i.cluster]
              } 
              onClick={({ target }) => (Object.values(target)[1].id)} 
            /> 
          )
        }
      </Scatter> }

      { clusters && <Scatter 
        name='Clusters' 
        data={
          clusters.map(i => ({ 
            title: i.name || `Cluster ${i.index}`,
            x: Math.round(i.center[0]*1000)/1000, 
            y: Math.round(i.center[1]*1000)/1000,             
            z: 500,
            size: i.size,
            target: i.avgOutput,
            outputKey, 
          }))
        }
      >
        { 
          clusters.map((i, k) => 
            <Cell 
              id={`${i.index}`}
              key={`cell-${k}`} 
              fill={i.color} 
              onClick={({ target }) => setAction && setAction({
                type: 'CLUSTER_PERF',
                value: clusters.find(({ index }) => index.toString() === Object.values(target)[1].id)!
              })} 
            /> 
          )
        }
      </Scatter> }

    </ScatterChart>
  </ResponsiveContainer>
}
