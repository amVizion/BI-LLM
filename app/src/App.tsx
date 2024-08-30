import { ClusterCorrelations, SingleCorrelations, VerticalCorrelations } from './components/Correlations'
import { NavBar, Footer, REPORT_VIEW } from './components/Layout'
import { Predictions } from './components/Predictions'
import { Report } from './components/Report'
import { Chart } from './components/Chart'

import CORRELATIONS from './data/correlations.json'
import { verticals, labelCorrelations } from './data/verticals.json'
import CLUSTERS from './data/clusters.json'
import REPORT from './data/report.json'
import ITEMS from './data/data.json'

import { iCluster, iItem } from './utils/types'
import { useEffect, useState } from 'react'
import 'bulma/css/bulma.css'
import './App.css'

const SECTION_STYLE = { minHeight:'calc(100vh - 180px)', paddingBottom:0, paddingTop:'2.5rem' }
const App = () => {
  const [view, setView] = useState<string>()
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




  return <>
    <NavBar setView={setView}/>
    <div className='section' style={SECTION_STYLE}>
      <div className='container' style={{maxWidth:1600}}>
        { view === REPORT_VIEW && <Report {...REPORT} /> }
        {
          view !== REPORT_VIEW && <>
            <Chart clusters={CLUSTERS} outputKey='Views' onClick={selectCluster}/>
            {
              cluster && verticals && 
              <VerticalCorrelations 
                title={`${cluster.name || `Cluster #${cluster.index}`} Correlations`}
                verticals={verticals} 
                verticalCorrelations={cluster.verticalCorrelations!} 
              />
            }

            {
              verticals && <>
                <VerticalCorrelations verticals={verticals} verticalCorrelations={labelCorrelations} />
                <ClusterCorrelations clusters={CLUSTERS} />
              </>
            }

            {
              !verticals && <SingleCorrelations clusters={CLUSTERS} correlations={CORRELATIONS} /> 
            }

            <Predictions items={items || []} correlations={CORRELATIONS}/>
          </>
        }

      </div>
      <Footer />
      </div>
    </>
}

export default App
