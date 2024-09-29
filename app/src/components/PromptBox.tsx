/* eslint-disable @typescript-eslint/no-unused-vars */
/*

1. Generate report for vertical.
2. Generate sample prediction.
3. Generate summary.

On load or empty: <summarize>.
On content: <predict>.
On vertical: replace & generate.
	- On clear - go back.

*/


import { useState } from "react"
import { iAction } from "../views/Items"

const OLLAMA_URL = 'http://localhost:11434/api/generate'

const path = 'M0 0 L5 6 L10 0'
const pathStyle = {stroke:'black', fill:'transparent', strokeWidth:2 }


type tButtonColor = 'is-primary' | 'is-link' | 'is-info' | 'is-success' | 'is-warning' | 'is-danger' | 'is-white'

interface iDropdown { text:string, children?:JSX.Element[], color?:tButtonColor }
export const Dropdown = ({ text, children, color='is-white' }:iDropdown) => {
	return <div className="dropdown is-hoverable">
		<div className="dropdown-trigger">
			<button className={`button ${color}`} aria-haspopup="true" aria-controls="dropdown-menu4">
				<span style={{marginRight:24}}> { text } </span>
				<svg style={{height:24, marginLeft:'auto', width:10, paddingTop:9}}>
					<path className='a1' d={path} style={pathStyle}></path>
				</svg>
			</button>
		</div>

		<div className="dropdown-menu" id="dropdown-menu4" role="menu">
			<div className="dropdown-content">
				{children}
			</div>
		</div>
	</div>
}

interface iPromptBox { prompt:string, setAction(action:iAction):void, setPrompt(text:string):void }

const ACTIONS = [
	{ action:'INTRO', text:'Introduction prompt' },
	{ action:'TOP_ATTRS', text:'Top attributes' },
	{ action:'WORST_ATTRS', text:'Worst attributes' },
	{ action:'SUMMARY', text:'Summary' },
	{ action:'ANALYSIS', text:'Analysis' },
	{ action:'TOP_VIDEOS', text:'Top videos' },
	{ action:'WORST_VIDEOS', text:'Worst videos' },
]

export const PromptBox = ({prompt, setAction, setPrompt}:iPromptBox) => {
	const [loading, setLoading] = useState<boolean>(false)
	const [response, setResponse] = useState<string>('')

	const ollamaStream = async() => {
		try{
			setLoading(true)
			setResponse('')

			const body = JSON.stringify({ prompt, model:'mistral' })
			const response:Response = await fetch(OLLAMA_URL, { method: 'POST', body })
			const reader = response?.body?.getReader()
			
			while (true) {
				const { done, value } = await reader!.read()

				if (done) break
				const decodedValue = new TextDecoder().decode(value)
				try{
					const { response } = JSON.parse(decodedValue)
					setResponse((r) => `${r}${response}`)	
				// eslint-disable-next-line no-empty
				} catch(e) {}
			}
		} catch(e) { console.log(e) } 
		finally { setLoading(false) }
	} // TODO: Add try/catch with axios.

	return <div style={{maxWidth:1200, margin:'auto', marginBottom:32}}>
		<div className="field">
			<div className={`control ${loading && 'is-loading'}`}>
				<textarea 
					rows={12}
					value={response || prompt}
					className="textarea" 
					style={{color:'white'}}
					onChange={({ target }) => setPrompt(target.value)}
				/>
			</div>
		</div>

		<div className="columns">
			<div className="column">
				<Dropdown text='Prompts'>
					{ ACTIONS.map(({ action, text }) => <a
						key={action}
						className="dropdown-item"
						onClick={() => setAction({type:action})}
					> { text } </a>)}
				</Dropdown>
			</div>

			<div className="column">
				<div className="field is-grouped is-justify-content-right">
					<div className="control">
						<button 
							className="button" 
							style={{marginRight:12}}
							onClick={() => navigator.clipboard.writeText(prompt)}
						> Copy </button>

						<button 
							className={`button is-link ${loading && 'is-loading'}`} 
							onClick={ollamaStream}
						> Submit </button>
					</div>
				</div>
			</div>
		</div>
	</div>
}
