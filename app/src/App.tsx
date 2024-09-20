import { NavBar, Footer } from './components/Layout'
import { ClusterView } from './views/ClusterView'
import { Report } from './views/Report'
import { Items } from './views/Items'

import REPORT from './data/report.json'
import { useState } from 'react'
import 'bulma/css/bulma.css'
import './App.css'

export const ITEM_VIEW = 'ITEM'
export const REPORT_VIEW = 'REPORT'
export const CLUSTER_VIEW = 'CLUSTER'

const SECTION_STYLE = { 
	minHeight:'calc(100vh - 180px)', 
	paddingBottom:0, 
	paddingTop:'2.5rem' 
}

const App = () => {
  const [view, setView] = useState<string>()

	return <>
		<NavBar setView={setView}/>
			<div className='section' style={SECTION_STYLE}>
				{ view === REPORT_VIEW && <Report {...REPORT} /> }
				{ view === CLUSTER_VIEW && <ClusterView /> }
				{ (!view || view === ITEM_VIEW) && <Items /> }
			</div>
		<Footer />
	</>
};

export default App
