/*

Correlations:
- Rows Clusters + Total
- Columns Attributes (Labels)

For each Cluster:
- Average score.

*/

import { iCluster, iCorrelation, iFullCorrelation, tClusterAttrStats } from "../utils/types"
import { CSSProperties, useEffect, useState } from "react"
import { Dropdown } from "./PromptBox"
import { iAction } from "../views/Items"


const TABLE_CLICK_STYLE = {cursor:'pointer', color:'black'}

interface iTD { value?:number | null, dashed?:boolean }
export const TD = ({value, dashed}:iTD) => value 
    ? <td style={dashed ? {borderBottom: '1px dashed white'} : {}}>  { Math.round(value*100)/100 } </td> 
    : <td />

// Table when no verticals are present. Orders attribubtes by cluster. Can be deprecated or refactored.
interface iSingleCorrelations { clusters:iCluster[], correlations:iCorrelation[] }
export const SingleCorrelations = ({ clusters, correlations }:iSingleCorrelations) => <table className='table is-fullwidth'>
<thead>
    <tr className={'is-light'}>
        <th colSpan={10} style={{color:'black', textAlign:'center'}}> 
            Correlations Table 
        </th>
    </tr>  

    <tr className={'is-light'}>
        <th style={{color:'black'}}> </th>
        <th colSpan={3} style={{color:'black', textAlign:'center'}}> Total </th>
        { clusters.map(({ name, index })=> 
            <th colSpan={2} key={index} style={{color:'black', textAlign:'center'}}> 
                { name || `Cluster #${index}` } 
            </th>
        )}
    </tr>

    <tr className={'is-light'}>
        <th style={{color:'black'}}> Attribute </th>
        <th style={{color:'black'}}> Rho </th>
        <th style={{color:'black'}}> Mean </th>
        <th style={{color:'black'}}> SD </th>

        { clusters.map(()=> <>
            <th style={{color:'black'}}> Mean </th>
            <th style={{color:'black'}}> Rho </th>
        </>)}
    </tr>
</thead>

<tbody>
    {/* Map through the attributes. Get the correlations */ }
    {
        correlations.map(({ label, rho, mean, sd }, i) => <tr key={i}>
            <td> { label } </td>
            <TD value={ rho } />
            <TD value={ mean } />
            <TD value={ sd } />

            { clusters.map(({ attributes }) => {
                const { mean, attrRho } = attributes.find(({ label:l }) => l === label)!
                return <>
                    <TD value={ mean } />
                    <TD value={ attrRho } />
                </>
            })}
        </tr>)
    }
</tbody>
</table>


interface iClusterAttributes { 
    title?:string 
    verticals:string[], 
    verticalCorrelations: {[vertical:string]:tClusterAttrStats[]}, 
}

// Table that explains the attributes for a given, selected, cluster.
export const ClusterAttributes = ({ verticals, verticalCorrelations, title }:iClusterAttributes) => {
    const [correlations, setCorrelations] = useState<{[vertical:string]:tClusterAttrStats[]}>(verticalCorrelations)

    useEffect(() => {
        // Sort correlations by rho. Then assign to corrs.
        const sorted = Object.keys(verticalCorrelations).reduce((acc, key) => {
            acc[key] = verticalCorrelations[key]
            .filter(({ prominence }) => prominence)
            .sort(({ prominence:a }, { prominence:b }) => b! < a! ? -1 : 1)
            return acc
        }, {} as {[key:string]:tClusterAttrStats[]})

        setCorrelations(sorted)
    }, [verticalCorrelations])

return <table className='table is-fullwidth'>
    <thead>
        <tr className={'is-light'}>
            <th colSpan={(verticals.length)*4} style={{color:'black', textAlign:'center'}}> 
                { title || 'Correlations Table' }
            </th>
        </tr>

        <tr className={'is-light'}>
            { verticals.map((v, i) => 
                <th style={{color:'black', textAlign:'center'}} colSpan={4} key={i}> {v} </th>
            )}
        </tr>

        <tr className={'is-light'}>
            { [...Array(verticals.length)].map(() => <>
                <th style={{color:'black'}}> Attribute </th>
				<th style={{color:'black'}}> <abbr title="Prevalence"> Prev. </abbr></th>
				<th style={{color:'black'}}> Rho </th>
				<th style={{color:'black'}}><abbr title="Causality"> Caus. </abbr> </th>
            </>)
            }
        </tr>
    </thead>

    <tbody>
        {
            [...Array(Math.max(...Object.keys(correlations).map(k => Object.keys(correlations[k]).length)))]
            .map((_, i) => <tr key={i}>
                { verticals.map((v) => {
                    const { label, deltaRho, attrRho, prominence } = correlations[v][i] || {}
                    return <>
                        <td> { label } </td>
                        <TD value={ deltaRho } />
                        <TD value={ attrRho } />
                        <TD value={ prominence } />
                    </>
                })}
            </tr>)
        }
    </tbody>
</table>
}

// Shows differences across clusters by comparing main attributes. TODO: Rename.
interface iClusterCorrelations { clusters:iCluster[], setAction(action:iAction):void }
export const ClusterCorrelations = ({ clusters, setAction }:iClusterCorrelations) => {
	const [sortedClusters, setClusters] = useState<iCluster[]>(clusters)
    const [sortKey, setSortKey] = useState<'deltaMean' | 'causality'>('deltaMean')

	useEffect(() => {
		// Sort Cluster attributes by causality.
		const orderedClusters = clusters.map((c) => {
			const attributes = c.attributes
            .sort(({[sortKey]:a}, {[sortKey]:b}) => a! > b! ? -1 : 1)
			return {...c, attributes}
		})
		setClusters(orderedClusters)
	}, [clusters, sortKey])

return <div className="table-container">
	<table className='table is-fullwidth'><thead> 
    <tr className={'is-light'}>
			<th colSpan={clusters.length*3} style={{color:'black', textAlign:'center'}}> 
				Cluster Correlations 
			</th>
		</tr>  

		<tr className={'is-light'}>
			{ clusters.map(cluster => 
				<th 
                    colSpan={3} 
                    key={cluster.index} 
                    onClick={()=> setAction({ type: 'CLUSTER_DESC', value: cluster})}
                    style={{color:'black', textAlign:'center', cursor:'pointer'}}
                > { cluster.name || `Cluster #${cluster.index} (${cluster.rank})` } </th>
			)}
		</tr>

    <tr className={'is-light'}>
			{ clusters.map(() => <>
				<th style={{color:'black'}}> Attribute </th>
				<th 
                    style={{color:'black', cursor:'pointer'}} 
                    onClick={()=> setSortKey('deltaMean')}
                ><abbr title="Prevalence"> Prev. </abbr></th>
				<th 
                    style={{color:'black', cursor:'pointer'}}
                    onClick={()=> setSortKey('causality')}
                ><abbr title="Causality"> Caus. </abbr> </th>
			</>)}
    </tr>
	</thead>

	<tbody>
		{
			[...Array(5)].map((_, i) => <tr>
				{
					sortedClusters.map(({ attributes }) => <>
						<td 
                            style={{ 
                                color: sortKey === 'deltaMean' ? attributes[i].attrRho > 0 ? 'palegreen' : 'lightcoral' : 'white', 
                                borderBottom: i===4 ? '1px dashed white' : 'auto' 
                            }} 
                        > { attributes[i].label } </td>
						<TD value={ attributes[i].deltaMean  || 0} dashed={i===4} />
						<TD value={ attributes[i].causality || 0 } dashed={i===4} />
					</>
				)}
			</tr>)
		} {
			[...Array(5)].map((_, i) => <tr>
				{
					sortedClusters.map(({ attributes }) => <>
						<td
                            style={{ 
                                color: sortKey === 'deltaMean' ? attributes[attributes.length -5 +i].attrRho > 0 ? 'lightcoral' : 'palegreen' : 'white', 
                            }} 
                        > { attributes[attributes.length -5 +i].label } </td>
						<TD value={ attributes[attributes.length -5 +i].deltaMean  || 0} />
						<TD value={ attributes[attributes.length -5 +i].causality || 0 } />
					</>
				)}
			</tr>)
		}

	</tbody>
</table></div>}


interface iVerticalCorrelations { 
    title?:string
    verticals:string[]
    setAction(action:iAction):void
    verticalCorrelations: {[vertical:string]:iFullCorrelation[]}
}

const TH_STYLE:CSSProperties = {color:'black', textAlign:'center'}

// Shows main attributes by vertical. Focus is on the rho value. TODO: Enable sorting.
export const VerticalCorrelations = ({ verticals, verticalCorrelations, setAction }:iVerticalCorrelations) => {
    const [correlations, setCorrelations] = useState<{[vertical:string]:iFullCorrelation[]}>(verticalCorrelations)
    const [sortKey, setSortKey] = useState<'rho' | 'mean' | 'sd' | 'prominence'>('mean')
    const [type, setType] = useState<string>('ATTRIBUTE')

    useEffect(() => {
        // Sort correlations by rho. Then assign to corrs.
        const sorted = Object.keys(verticalCorrelations).reduce((acc, key) => {
            acc[key] = verticalCorrelations[key]
            .sort((a, b) => b[sortKey] - a[sortKey])
            return acc
        }, {} as {[key:string]:iFullCorrelation[]})

        setCorrelations(sorted)
    }, [verticalCorrelations, sortKey])

return <table className='table is-fullwidth'>
    <thead>
        <tr className={'is-light'}>
            <th colSpan={(verticals.length)*5 -2} style={TH_STYLE}> 
                { 'Vertical Correlations' }
            </th>

            <th colSpan={2}>
                <Dropdown text={'Actions'} color='is-info'>
                    <a className="dropdown-item" onClick={() => setAction({type:'CLUSTER'})}>  
                        Cluster items 
                    </a>
                    <hr className="dropdown-divider" />
                    <a className="dropdown-item" onClick={() => setType('ATTRIBUTE')}>  
                        Attribute by video 
                    </a>
                    <a className="dropdown-item" onClick={() => setType('ATTR_DESC')}>  
                        Attribute description 
                    </a>
                    <a className="dropdown-item" onClick={() => setType('ATTR_PERF')}> 
                        Attribute performance
                    </a>
                    <a className="dropdown-item" onClick={() => setType('ATTR_CHANNELS')}>
                        Attribute performance
                    </a>
                </Dropdown>
            </th>            
        </tr>

        <tr className={'is-light'}>
            { verticals.map((v, i) => 
                <th 
                    style={{...TH_STYLE, cursor:'pointer'}} 
                    onClick={() => setAction({ type:'VERTICAL', value:v })} 
                    colSpan={5} 
                    key={i}
                > {v} </th>
            )}
        </tr>

        <tr className={'is-light'}>
            { [...Array(verticals.length)].map(() => <>
                <th style={{color:'black'}}> Attribute </th>
                <th style={TABLE_CLICK_STYLE} onClick={() => setSortKey('mean')}> Mean </th>
                <th style={TABLE_CLICK_STYLE} onClick={() => setSortKey('sd')}> SD </th>
                <th style={TABLE_CLICK_STYLE} onClick={() => setSortKey('rho')}> Rho </th>
                <th style={TABLE_CLICK_STYLE} onClick={() => setSortKey('prominence')}> 
                    <abbr title="Prevalence"> % </abbr> 
                </th>
            </>)
            }
        </tr>
    </thead>


	<tbody>
		{
			[...Array(5)].map((_, i) => <tr>
                { verticals.map((v) => {
                    const { label, rho, mean, sd, prominence } = correlations[v][i] || {}
                    return <>
                        <td 
                            style={{
                                cursor:'pointer', 
                                borderBottom: i===4 ? '1px dashed white' : 'auto'
                            }}
                            onClick={() => setAction({ type, value:label, async: type !== 'ATTRIBUTE' })}
                        > { label } </td>
                        <TD value={ mean } dashed={i===4}/>
                        <TD value={ sd } dashed={i===4}/>
                        <TD value={ rho } dashed={i===4}/>
                        <TD value={ prominence } dashed={i===4}/>
                    </>
                })}
			</tr>)
		}

		{
			[...Array(5)].map((_, i) => <tr>
                { verticals.map((v) => {
                    const { label, rho, mean, sd, prominence } = correlations[v][correlations[v].length -5 +i] || {}
                    return <>
                        <td 
                            style={{ cursor:'pointer' }}
                            onClick={() => setAction({ type, value:label, async: type !== 'ATTRIBUTE' })}
                        > { label } </td>
                        <TD value={ mean } />
                        <TD value={ sd } />
                        <TD value={ rho } />
                        <TD value={ prominence } />
                    </>
                })}
			</tr>)
		}

	</tbody>
</table>
}
