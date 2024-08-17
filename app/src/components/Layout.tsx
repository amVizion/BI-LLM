const NAVBAR_MENU_STYLE = { maxWidth:1200, marginRight:'auto', background:'#0A0A0A' }
const NAVBAR_LOGO = {paddingTop:'0.25rem', paddingBottom:'0.25rem'}
export const REPORT_VIEW = 'REPORT'

interface iNavBar { setView(app?:string):void }
export const NavBar = ({ setView }:iNavBar) => <nav 
    className='navbar is-black' 
    role='navigation' 
    aria-label='main navigation'
>
    <div className='container'>
        <div className='navbar-brand'>
            <a className='navbar-item' style={NAVBAR_LOGO} onClick={() => setView()}>
                <img 
                    src='logo.png' 
                    style={{ height:48, maxHeight:'none' }} 
                    alt={'amVizion logo'}
                />
                <p 
                    className='navbar-item' 
                    style={{ fontSize: '2em', color:'white', paddingLeft:0 }}
                > amVizion </p>
            </a>
        </div>

        <div className="navbar-menu" style={NAVBAR_MENU_STYLE}>
            <div className="navbar-end">
                <a className="navbar-item" onClick={() => setView(REPORT_VIEW)}>
                    Report
                </a>
            </div>
        </div>
    </div>
</nav>


const footerStyle = {height:80, padding:'40px 0px 0px 0px', backgroundColor:'transparent'}

export const Footer = () => <footer className='footer' style={footerStyle}>
    <div className='content has-text-centered'>
        <p style={{color:'white'}}>
            <strong style={{color:'white'}}> Nahual </strong>  a product by 
            <a href='https://amvizion.org' style={{color:'skyblue'}}> amVizion </a>. 
        </p>
    </div>
</footer>
