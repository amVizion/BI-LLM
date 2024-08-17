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
  
  import { iCluster, iScatterData } from '../utils/types'
  import { numberFormater } from '../utils/utils'
  
  const CHART_MARGIN = { top:20, right:20, bottom:20, left:20 }
  const TOOLTIP_STYLE = {backgroundColor:'white', padding:12, borderColor: '1px solid #f5f5f5', color:'black'}
  const CustomTooltip = ({ active, payload }: any) => active && <div style={TOOLTIP_STYLE}>
    <strong style={{color:'black'}}> {payload[0].payload.title} </strong>
    <p> x: {payload[0].payload.x} </p>
    <p> y: {payload[0].payload.y} </p>
    <p> Items: {payload[0].payload.z} </p>
    <p> { payload[0].payload.outputKey }: {numberFormater(payload[0].payload.target)} </p>
  </div>
  
  interface iClusterChart { 
    outputKey?: string
    data?:iScatterData[]
    clusters?: iCluster[]
    onClick?(index:string):void
  }
  
  export const Chart = ({ clusters, data, outputKey, onClick }: iClusterChart) => 
    <ResponsiveContainer width='100%' height={400}>
      <ScatterChart margin={CHART_MARGIN}>
        <CartesianGrid />
        <XAxis type='number' dataKey='x' />
        <YAxis type='number' dataKey='y' />
        <ZAxis type='number' dataKey='z' range={[60, 400]} name='items'/>
        <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip/>} />
        { data && <Scatter
          name={'Channels'}
          data={data.map(d => ({...d, outputKey }))}
        /> }
  
        { clusters && <Scatter 
          name='Clusters' 
          data={
            clusters.map(({ center, items, name, avgOutput, index }) => ({ 
              title: name || index,
              x: Math.round(center[0]*1000)/1000, 
              y: Math.round(center[1]*1000)/1000,             
              z: items.length,
              outputKey, 
              target: avgOutput,
//              correlation: avgOutput
            }))
          }
        >
          { 
            clusters.map(({ index, color }, i) => 
              <Cell 
                id={`${index}`}
                fill={color || 'green'} 
                key={`cell-${i}`} 
                onClick={({ target }) => onClick && onClick(Object.values(target)[1].id)} 
              /> 
            )
          }
        </Scatter> }
      </ScatterChart>
    </ResponsiveContainer>
  