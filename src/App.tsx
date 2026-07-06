import "./App.css";
//import Button from '@mui/material/Button';
//import Stack from '@mui/material/Stack';
import Header from "./components/Header";
import SideMenu from "./components/sideMenu";
import { HashRouter, Routes, Route } from "react-router-dom";
import Parts from "./pages/Parts";
//import EditParts from "./pages/PartListAndEdit";
// import DeleteParts from "./pages/PartsDelete";
import Processes from "./pages/Processes";
//import EditProcesses from "./pages/ProcessListAndEdit";
// import DeleteProcessed from "./pages/ProcessedDelete";
import BomEditor from "./pages/BomEditor";
import BomListAndEdit from "./pages/BomListAndEdit";
import ImportParts from "./pages/ImportParts";
import ExportParts from "./pages/ExportParts";
import MakeRecord from "./pages/MakeRecord";
import Inventory from "./pages/Inventory";
import Help from "./pages/help";
import { isDemoMode } from "./utils/demoApi";

function App() {
  return (
    <HashRouter>
      <div className="App">
        {isDemoMode && (
          <div
            style={{
              position: "sticky",
              top: 0,
              zIndex: 1000,
              padding: "8px 16px",
              backgroundColor: "#1f3f35",
              color: "#fff",
              fontSize: 14,
              letterSpacing: 0.2,
            }}
          >
            デモ表示中です。GitHub Pages
            ではローカルのサンプルデータを使っています。
          </div>
        )}
        <div className="main-layout">
          <div id="side-menu">
            <SideMenu />
          </div>
          <main className="content">
            {/* <Header /> */}
            <Routes>
              <Route path="/" element={<Help />} />
              <Route path="/parts" element={<Parts />} />
              {/* <Route path="/EditParts" element={<EditParts />} /> */}
              {/* <Route path="/DeleteParts" element={<DeleteParts />} /> */}
              <Route path="/processes" element={<Processes />} />
              {/* <Route path="/EditProcesses" element={<EditProcesses />} /> */}
              {/* <Route path="/DeleteProcessed" element={<DeleteProcessed />} /> */}
              <Route path="/BomEditor" element={<BomEditor />} />
              <Route path="/BomListAndEdit" element={<BomListAndEdit />} />
              <Route path="/ImportParts" element={<ImportParts />} />
              <Route path="/ExportParts" element={<ExportParts />} />
              <Route path="/MakeRecord" element={<MakeRecord />} />
              <Route path="/Inventory" element={<Inventory />} />
            </Routes>
          </main>
        </div>
      </div>
    </HashRouter>
  );
}

export default App;
