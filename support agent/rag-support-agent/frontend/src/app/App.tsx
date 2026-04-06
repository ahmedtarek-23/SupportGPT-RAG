import { Navigation } from "./components/Navigation";
import { Hero } from "./components/Hero";
import { Marquee } from "./components/Marquee";
import { Services } from "./components/Services";
import { Projects } from "./components/Projects";
import { Team } from "./components/Team";
import { Testimonials } from "./components/Testimonials";
import { SupportChat } from "./components/SupportChat";
import { Contact } from "./components/Contact";
import { Footer } from "./components/Footer";

export default function App() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#03040F",
        fontFamily: "Space Grotesk, sans-serif",
        overflowX: "hidden",
      }}
    >
      <Navigation />
      <Hero />
      <Marquee />
      <Services />
      <Projects />
      <Team />
      <Testimonials />
      <SupportChat />
      <Contact />
      <Footer />
    </div>
  );
}
