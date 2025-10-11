import { BrowserRouter as Router, Routes, Route } from 'react-router'
import './css/App.css'
import WikiPage from './components/WikiPage'
import SearchBar from './components/SearchBar'
import ConfigPage from './components/ConfigPage'

function App() {
  console.log("app started")
  return (
    <Router>
      {/* Place SearchBar outside Routes so it appears on every page */}
      <SearchBar />
      <Routes>
        <Route path="/" element={<WikiPage pageName='Main_Page' pageType={"wikiPage"}/>} />
        <Route path='/dico/:key' element={<WikiPage pageType={"dicoPage"}/>}/>
        <Route path="/:key" element={<WikiPage pageType={"wikiPage"}/>} /> 
        <Route path='/magic' element={<ConfigPage/>} />
        <Route path="/wiki" element={<WikiPage pageName='Main_Page' pageType={"wikiPage"}/>} />
        <Route path="/wiki/:key" element={<WikiPage pageType={"wikiPage"} />} />
      </Routes>
    </Router>
  )
}

export default App
