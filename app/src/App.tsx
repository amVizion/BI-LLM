import { NavBar, Footer, REPORT_VIEW } from './components/Layout'
import { Correlations } from './components/Correlations'
import { Predictions } from './components/Predictions'
import { Report } from './components/Report'
import { Chart } from './components/Chart'

import CORRELATIONS from './data/correlations.json'
import CLUSTERS from './data/clusters.json'
import REPORT from './data/report.json'
import ITEMS from './data/data.json'

import { useState } from 'react'
import 'bulma/css/bulma.css'
import './App.css'

const SECTION_STYLE = { minHeight:'calc(100vh - 180px)', paddingBottom:0, paddingTop:'2.5rem' }
const App = () => {
  const [view, setView] = useState<string>()

  return <>
    <NavBar setView={setView}/>
    <div className='section' style={SECTION_STYLE}>
      <div className='container'>
        { view === REPORT_VIEW && <Report {...REPORT} /> }
        {
          view !== REPORT_VIEW && <>
            <Chart clusters={CLUSTERS} outputKey='Views'/>
            <Correlations clusters={CLUSTERS} correlations={CORRELATIONS} />
            <Predictions items={ITEMS} correlations={CORRELATIONS}/>
          </>
        }

      </div>
      <Footer />
      </div>
    </>
}

export default App
