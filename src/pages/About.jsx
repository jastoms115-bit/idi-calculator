import { Link } from 'react-router-dom'
import thomargLogo from '../assets/thomarg-logo-reversed.svg'
import Nav from '../components/Nav'

const SECTION_HEADING = { fontSize: 18, marginTop: 28, marginBottom: 8 }
const PARA = { marginBottom: 8 }

export default function About() {
  return (
    <>
      <div className="screen screen--with-nav">
        <div className="eyebrow" style={{ marginTop: 24, marginBottom: 16 }}>
          About
        </div>

        <img
          src={thomargLogo}
          alt="Thomarg Technologies"
          style={{ width: '100%', maxWidth: 280, marginBottom: 24 }}
        />

        <h2 style={{ ...SECTION_HEADING, marginTop: 0 }}>Who We Are</h2>
        <p style={PARA}>
          Thomarg Technologies is a technology-driven company founded with
          a clear purpose: to solve engineering problems through
          technology and artificial intelligence.
        </p>

        <h2 style={SECTION_HEADING}>Our Mission</h2>
        <p style={PARA}>Solving engineering problems with technology and AI.</p>

        <h2 style={SECTION_HEADING}>Our Vision</h2>
        <p style={PARA}>
          To build intelligent engineering solutions that make technical
          work smarter, faster, more accurate, and more accessible.
        </p>

        <h2 style={SECTION_HEADING}>What We Do</h2>
        <p style={PARA}>
          Engineering software and calculation tools; AI-powered
          engineering solutions; digital tools for engineering
          operations; automation of repetitive engineering tasks; and
          technology solutions for maintenance and technical
          decision-making.
        </p>

        <h2 style={SECTION_HEADING}>Our Approach</h2>
        <p style={PARA}>
          We believe many engineering challenges can be solved more
          effectively when engineering knowledge is combined with modern
          technology and AI.
        </p>

        <h2 style={SECTION_HEADING}>Our First Product</h2>
        <p style={PARA}>
          IDI Calculator is an engineering calculation and
          decision-support tool developed by Thomarg Technologies —
          field-deployable condition monitoring for pumps, motors, and
          rotating equipment, built on the Ijimari Degradation Index
          (IDI), a composite score derived from vibration, current,
          temperature, pressure, flow, and run hours against each
          asset's own baseline. Works offline in the field and syncs
          automatically once a connection returns.
        </p>

        <h2 style={SECTION_HEADING}>Founder</h2>
        <p style={{ ...PARA, fontWeight: 600 }}>James Thomas Ijimari</p>
        <p style={{ ...PARA, color: 'var(--text-muted)' }}>
          Mechanical Engineer | Researcher | Business Enthusiast
        </p>
        <p style={PARA}>
          James Thomas Ijimari is a Mechanical Engineer, researcher, and
          business enthusiast with a passion for solving practical
          engineering problems through technology and innovation. He
          founded Thomarg Technologies with the vision of combining
          engineering knowledge, technology, and artificial intelligence
          to develop practical solutions for real-world challenges.
        </p>
        <p style={{ ...PARA, fontStyle: 'italic', color: 'var(--text-muted)' }}>
          "I believe technology and AI can transform the way we approach
          engineering problems — making solutions smarter, faster, and
          more accessible."
        </p>

        <h2 style={SECTION_HEADING}>Contact</h2>
        <p style={{ marginBottom: 24 }}>
          <a href="mailto:quickreplymails@gmail.com">quickreplymails@gmail.com</a>
        </p>

        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          IDI Calculator v1.0 — Thomarg Technologies
        </p>

        <div style={{ marginTop: 24 }}>
          <Link to="/dashboard" className="btn-link">
            &larr; Back to Dashboard
          </Link>
        </div>
      </div>
      <Nav />
    </>
  )
}
