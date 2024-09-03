/*

Correlations:
- Rows Clusters + Total
- Columns Attributes (Labels)

For each Cluster:
- Average score.

*/

import { iCluster, iCorrelation, tAttribute } from "../utils/types"
import { useEffect, useState } from "react"


export const TD = ({value}:{value?:number | null}) => value ? <td>  { Math.round(value*100)/100 } </td> : <td />

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
                const { average, correlation } = attributes.find(({ label:l }) => l === label)!
                return <>
                    <TD value={ average } />
                    <TD value={ correlation } />
                </>
            })}
        </tr>)
    }
</tbody>
</table>


interface iClusterAttributes { 
    title?:string 
    verticals:string[], 
    verticalCorrelations: {[vertical:string]:tAttribute[]}, 
}

export const ClusterAttributes = ({ verticals, verticalCorrelations, title }:iClusterAttributes) => {
    const [correlations, setCorrelations] = useState<{[vertical:string]:tAttribute[]}>(verticalCorrelations)

    useEffect(() => {
        // Sort correlations by rho. Then assign to corrs.
        const sorted = Object.keys(verticalCorrelations).reduce((acc, key) => {
            acc[key] = verticalCorrelations[key]
            .filter(({ causality }) => causality)
            .sort(({ causality:a }, { causality:b }) => b! < a! ? -1 : 1)
            return acc
        }, {} as {[key:string]:tAttribute[]})

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
                    const { label, prevalence, correlation, causality } = correlations[v][i] || {}
                    return <>
                        <td> { label } </td>
                        <TD value={ prevalence } />
                        <TD value={ correlation } />
                        <TD value={ causality } />
                    </>
                })}
            </tr>)
        }
    </tbody>
</table>
}

export const ClusterCorrelations = ({ clusters }:{clusters:iCluster[]}) => {
	const [sortedClusters, setClusters] = useState<iCluster[]>(clusters)

	useEffect(() => {
		// Sort Cluster attributes by causality.
		const orderedClusters = clusters.map((c) => {
			const attributes = c.attributes
            .filter(({ causality, prevalence }) => causality && (prevalence || -1) > 0)
            .sort(({causality:a}, {causality:b}) => a! > b! ? -1 : 1)
			return {...c, attributes}
		})
		setClusters(orderedClusters)
	}, [clusters])

return <div className="table-container">
	<table className='table is-fullwidth'><thead> 
    <tr className={'is-light'}>
			<th colSpan={clusters.length*4} style={{color:'black', textAlign:'center'}}> 
				Cluster Correlations 
			</th>
		</tr>  

		<tr className={'is-light'}>
			{ clusters.map(({ name, index })=> 
				<th colSpan={4} key={index} style={{color:'black', textAlign:'center'}}> 
					{ name || `Cluster #${index}` } 
				</th>
			)}
		</tr>

    <tr className={'is-light'}>
			{ clusters.map(() => <>
				<th style={{color:'black'}}> Attribute </th>
				<th style={{color:'black'}}> <abbr title="Prevalence"> Prev. </abbr></th>
				<th style={{color:'black'}}> Rho </th>
				<th style={{color:'black'}}><abbr title="Causality"> Caus. </abbr> </th>
			</>)}
    </tr>
	</thead>

	<tbody>
		{
			[...Array(5)].map((_, i) => <tr>
				{
					sortedClusters.map(({ attributes }) => <>
						<td> { attributes[i].label } </td>
						<TD value={ attributes[i].prevalence  || 0} />
						<TD value={ attributes[i].correlation } />
						<TD value={ attributes[i].causality || 0 } />
					</>
				)}
			</tr>)
		}

		{
			[...Array(5)].map((_, i) => <tr>
				{
					sortedClusters.map(({ attributes }) => <>
						<td> { attributes[i].label } </td>
						<TD value={ attributes[attributes.length - i -1].prevalence  || 0} />
						<TD value={ attributes[attributes.length - i -1].correlation } />
						<TD value={ attributes[attributes.length - i -1].causality || 0 } />
					</>
				)}
			</tr>)
		}

	</tbody>
</table></div>}


interface iVerticalCorrelations { 
    title?:string 
    verticals:string[], 
    verticalCorrelations: {[vertical:string]:iCorrelation[]}, 
}

export const VerticalCorrelations = ({ verticals, verticalCorrelations, title }:iVerticalCorrelations) => {
    const [correlations, setCorrelations] = useState<{[vertical:string]:iCorrelation[]}>(verticalCorrelations)

    useEffect(() => {
        // Sort correlations by rho. Then assign to corrs.
        const sorted = Object.keys(verticalCorrelations).reduce((acc, key) => {
            acc[key] = verticalCorrelations[key]
            .filter(({ rho }) => rho)
            .sort((a, b) => b.rho - a.rho)
            return acc
        }, {} as {[key:string]:iCorrelation[]})

        setCorrelations(sorted)
    }, [verticalCorrelations])

return <table className='table is-fullwidth'>
    <thead>
        <tr className={'is-light'}>
            <th colSpan={(verticals.length)*4} style={{color:'black', textAlign:'center'}}> 
                { title || 'Vertical Correlations' }
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
                <th style={{color:'black'}}> Rho </th>
                <th style={{color:'black'}}> Mean </th>
                <th style={{color:'black'}}> SD </th>
            </>)
            }
        </tr>
    </thead>

    <tbody>
        {
            [...Array(Math.max(...Object.keys(correlations).map(k => Object.keys(correlations[k]).length)))]
            .map((_, i) => <tr key={i}>
                { verticals.map((v) => {
                    const { label, rho, mean, sd } = correlations[v][i] || {}
                    return <>
                        <td> { label } </td>
                        <TD value={ rho } />
                        <TD value={ mean } />
                        <TD value={ sd } />
                    </>
                })}
            </tr>)
        }
    </tbody>
</table>
}
