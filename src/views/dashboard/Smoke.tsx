import React, { useEffect } from "react";
import './Smoke.sass'

const Smoke: React.FC = () => {
useEffect(() => {
  const script = document.createElement("script");
  script.src = "smoke.js";
  script.async = true;
  document.body.appendChild(script);
},[])
  return <div className="Smoke" id="Smoke"></div>

}

export default Smoke;
