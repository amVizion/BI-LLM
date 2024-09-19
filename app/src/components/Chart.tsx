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
  
const CHART_MARGIN = { top:20, right:20, bottom:20, left:20 }
const TOOLTIP_STYLE = {backgroundColor:'white', padding:12, borderColor: '1px solid #f5f5f5', color:'black'}
const CustomTooltip = ({ active, payload }: any) => active && <div style={TOOLTIP_STYLE}>
    <strong style={{color:'black'}}> {payload[0].payload.title} </strong>
    <p> x: {payload[0].payload.x} </p>
    <p> y: {payload[0].payload.y} </p>
    { /* <p> Items: {payload[0].payload.z} </p> */ } { /* TODO: Fix for clusters */ }
    <p> { payload[0].payload.outputKey }: {numberFormater(payload[0].payload.target)} </p>
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
  data: iItem[] | iCluster[]
  onClick?(index:string):void
}

interface iColoredItem extends iItem { color:string }
  
export const Chart = ({ data, outputKey, onClick }: iClusterChart) => {
  const [items, setItems] = useState<iColoredItem[] | iCluster[]>()

  // If items are iItems then compute color.
  useEffect(() => {
    if (data && 'output' in data[0]) {
      const coloredItems = computeColor(data as iItem[])
      return setItems(coloredItems)
    }

    setItems(data as iCluster[])
  }, [data])

  return <ResponsiveContainer width='100%' height={400}>
    <ScatterChart margin={CHART_MARGIN}>
      <CartesianGrid />
      <XAxis type='number' dataKey='x' />
      <YAxis type='number' dataKey='y' />
      <ZAxis type='number' dataKey='z' range={[60, 200]} name='items'/> { /* TODO: Fix for clusters */ }
      <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip/>} />

      { items && <Scatter 
        name='Clusters' 
        data={
          items.map(i => ({ // ({ center, name, text, avgOutput, index, size }) => ({ 
            title: "text" in i ? i.text : i.name,
            x: Math.round(i.center[0]*1000)/1000, 
            y: Math.round(i.center[1]*1000)/1000,             
            z: 'size' in i ? i.size : 200,
            target: 'avgOutput' in i ? i.avgOutput : i.output,
            outputKey, 
          }))
        }
      >
        { 
          items.map((i, k) => 
            <Cell 
              id={`${'index' in i ? i.index : k}`}
              key={`cell-${k}`} 
              fill={i.color} 
              onClick={({ target }) => onClick && onClick(Object.values(target)[1].id)} 
            /> 
          )
        }
      </Scatter> }
    </ScatterChart>
  </ResponsiveContainer>
}
