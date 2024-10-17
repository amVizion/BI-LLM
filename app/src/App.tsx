import { iFullCorrelation, iVerticals, tVerticalCorrelations, iItem } from './utils/types'
import { NavBar, Footer } from './components/Layout'
import { Items } from './views/Items'

import clusterLabels from './data/clusters/correlations.json'
import clusterVerticals from './data/clusters/verticals.json'
import clusters from './data/clusters/data.json'

import correlations from './data/verticals.json'
import labels from './data/correlations.json'
import items from './data/data.json'

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
	const [clusterCorrelations, setClusterCorrelations] = useState<iVerticals>()

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

	useEffect(() => {
		// Iterate by vertical (key), and add an extra attribute to each element in the dictionary.
		const { labelCorrelations } = clusterVerticals
		const fullCorrelations:tVerticalCorrelations = Object.keys(labelCorrelations).reduce((acc, key) => {
			const correlations = labelCorrelations[key as keyof typeof labelCorrelations]
			const fullCorrelations:iFullCorrelation[] = correlations.map(d => ({ ...d, prominence: d.rho * d.mean }))
			return { ...acc, [key]: fullCorrelations }
		}, {})

		setClusterCorrelations({...correlations, verticalCorrelations:fullCorrelations })
	}, [])


	if(!verticalCorrelations) return <div className='section' style={SECTION_STYLE} /> 

	return <>
		<NavBar setView={setView}/>
			<div className='section' style={SECTION_STYLE}>
				{ 
					// view === REPORT_VIEW && <Report /> }
				}
				{ 
					(view === CLUSTER_VIEW) && clusterCorrelations?.verticalCorrelations && <Items 
						verticals={clusterVerticals.verticals}
						verticalCorrelations={clusterCorrelations.verticalCorrelations}
						correlations={clusterLabels}
						items={clusters as iItem[]}
					/> 
				}
				{ 
					(!view || view === ITEM_VIEW) && verticalCorrelations.verticalCorrelations && <Items 
						verticals={clusterVerticals.verticals}
						verticalCorrelations={verticalCorrelations.verticalCorrelations}
						correlations={labels}
						items={items as iItem[]}
					/> 
				}
			</div>
		<Footer />
	</>
}

export default App
