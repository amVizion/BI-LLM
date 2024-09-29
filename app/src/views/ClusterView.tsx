import { SingleCorrelations, VerticalCorrelations } from '../components/Correlations'
import { ClusterAttributes, ClusterCorrelations } from '../components/Correlations'
import { Predictions } from '../components/Predictions'
import { Chart } from '../components/Chart'

import CORRELATIONS from '../data/correlations.json'
import CLUSTERS from '../data/clusters.json'
import ITEMS from '../data/data.json'

import { iCluster, iItem, iVerticals } from '../utils/types'
import { useEffect, useState } from 'react'


export const ClusterView = ({ verticals, verticalCorrelations}: iVerticals) => {
  const [items, setItems] = useState<iItem[]>()
  const [cluster, setCluster] = useState<iCluster>()

  useEffect(() => {
    // Select top 100 items based on output.
    const items = (ITEMS! as iItem[]).sort((a, b) => b.output - a.output).slice(0, 100)
    setItems(items)
  }, []) // TODO: Implement pagination on table.

  const selectCluster = (i:string) => {
    const idx = parseInt(i)

    const cluster = (CLUSTERS).find(({ index }) => index === idx)!
    setCluster(cluster)

    // Get top 100 items from cluster.
    const clusterItems = (ITEMS as iItem[]).filter(({ cluster }) => cluster === idx)
    .sort((a, b) => b.output - a.output).slice(0, 100)

    console.log(clusterItems.length)

    setItems(clusterItems)
  } // TODO: Display items on chart.

  return <div className='container' style={{maxWidth:1600}}>
    <Chart data={CLUSTERS} outputKey='Views' onClick={selectCluster}/>

    {
      cluster && <div className="field content">
        { <h2> { cluster.name || 'Cluster Title' } </h2> }
        <textarea 
          disabled
          rows={12}
          value={cluster.description}
          className="textarea" 
          style={{color:'white'}}
        />
      </div>
    }

    {
      cluster && verticals && 
      <ClusterAttributes 
        verticals={verticals} 
        verticalCorrelations={cluster.verticalAttributes!} 
        title={`${cluster.name || `Cluster #${cluster.index}`} Correlations`}
      />
    }

    {
      verticals && <>
        <VerticalCorrelations 
          verticals={verticals} 
          verticalCorrelations={verticalCorrelations!} 
        />
        <ClusterCorrelations clusters={CLUSTERS} />
      </>
    }

    {
      !verticals && <SingleCorrelations clusters={CLUSTERS} correlations={CORRELATIONS} /> 
    }

    <Predictions items={items || []} clusters={CLUSTERS}/>
  </div>
}
