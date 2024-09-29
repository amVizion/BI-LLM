import { iFullCorrelation, iVerticals, tVerticalCorrelations } from './utils/types'
import correlations from './data/verticals.json'
import { NavBar, Footer } from './components/Layout'
// import { ClusterView } from './views/ClusterView'
// import { Report } from './views/Report'
import { Items } from './views/Items'

import { useEffect, useState } from 'react'
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
	const [verticalCorrelations, setVerticalCorrelations] = useState<iVerticals>()

	useEffect(() => {
		// Iterate by vertical (key), and add an extra attribute to each element in the dictionary.
		const { labelCorrelations } = correlations
		const fullCorrelations:tVerticalCorrelations = Object.keys(labelCorrelations).reduce((acc, key) => {
			const correlations = labelCorrelations[key as keyof typeof labelCorrelations]
			const fullCorrelations:iFullCorrelation[] = correlations.map(d => ({ ...d, prominence: d.rho * d.mean }))
			return { ...acc, [key]: fullCorrelations }
		}, {})

		setVerticalCorrelations({...correlations, verticalCorrelations:fullCorrelations })
	}, [])


	if(!verticalCorrelations) return <div className='section' style={SECTION_STYLE} /> 

	return <>
		<NavBar setView={setView}/>
			<div className='section' style={SECTION_STYLE}>
				{ 
					// view === REPORT_VIEW && <Report /> }
					// view === CLUSTER_VIEW && <ClusterView {...verticalCorrelations}/> }
				}
				{ (!view || view === ITEM_VIEW) && <Items {...verticalCorrelations} /> }
			</div>
		<Footer />
	</>
}

export default App
