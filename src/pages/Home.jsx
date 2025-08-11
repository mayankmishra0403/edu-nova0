import { useRef } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";

export default function Home({ onNavigate }) {
  const { user } = useAuth();
  const isAuthed = !!user;
  const heroRef = useRef(null);
  const statsRef = useRef(null);

  return (
    <div className="home-page">
      {/* Animated Background */}
      <div className="bg-particles">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="particle"
            style={{
              '--delay': `${i * 0.5}s`,
              '--duration': `${8 + i * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Hero Section - Completely Redesigned */}
      <section className="hero-dynamic" ref={heroRef}>
        <div className="hero-bg-gradient"></div>
        <div className="hero-content">
          {/* Floating Elements */}
          <div className="floating-icons">
            <div className="float-icon" style={{ '--x': '10%', '--y': '20%', '--delay': '0s' }}>🚀</div>
            <div className="float-icon" style={{ '--x': '85%', '--y': '15%', '--delay': '1s' }}>💡</div>
            <div className="float-icon" style={{ '--x': '15%', '--y': '80%', '--delay': '2s' }}>📚</div>
            <div className="float-icon" style={{ '--x': '80%', '--y': '75%', '--delay': '1.5s' }}>🎯</div>
          </div>

          <div className="hero-main">
            <div className="hero-text" id="animate-hero">
              <div className="hero-badge">
                <span className="badge-glow">✨ New Features Available</span>
              </div>
              <h1 className="hero-title">
                <span className="title-line">Transform Your</span>
                <span className="title-highlight">Learning Journey</span>
                <span className="title-line">with AI-Powered Education</span>
              </h1>
              <p className="hero-description">
                Experience the future of learning with our intelligent platform. 
                Personalized study paths, instant AI assistance, and comprehensive 
                placement preparation - all in one place.
              </p>
              
              <div className="hero-actions">
                <button 
                  className="btn-hero-primary"
                  onClick={() => onNavigate?.(isAuthed ? "ai" : "profile")}
                >
                  <span>Start Learning</span>
                  <div className="btn-glow"></div>
                </button>
                <button 
                  className="btn-hero-secondary"
                  onClick={() => onNavigate?.(isAuthed ? "academics" : "profile")}
                >
                  <span>Explore Content</span>
                </button>
              </div>

              {/* Quick Stats */}
              <div className="hero-stats" id="animate-stats" ref={statsRef}>
                <div className="stat-item">
                  <div className="stat-number">10K+</div>
                  <div className="stat-label">Students</div>
                </div>
                <div className="stat-divider"></div>
                <div className="stat-item">
                  <div className="stat-number">500+</div>
                  <div className="stat-label">Resources</div>
                </div>
                <div className="stat-divider"></div>
                <div className="stat-item">
                  <div className="stat-number">24/7</div>
                  <div className="stat-label">AI Support</div>
                </div>
              </div>
            </div>

            <div className="hero-visual">
              <div className="interactive-card" id="animate-card">
                <div className="card-glow"></div>
                <div className="card-content">
                  <div className="card-header">
                    <div className="ai-avatar">
                      <div className="avatar-glow"></div>
                      🤖
                    </div>
                    <div>
                      <h4>EduAI Assistant</h4>
                      <p>Always ready to help</p>
                    </div>
                  </div>
                  <div className="chat-preview">
                    <div className="message-bubble user">
                      What's the best way to learn React?
                    </div>
                    <div className="message-bubble ai">
                      <div className="typing-dots">
                        <span></span><span></span><span></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid - Redesigned */}
      <section className="features-dynamic">
        <div className="container">
          <div className="section-header" id="animate-features-header">
            <h2>Everything You Need to Succeed</h2>
            <p>Comprehensive tools and resources designed for modern learners</p>
          </div>

          <div className="features-grid">
            {[
              {
                icon: "🤖",
                title: "AI-Powered Learning",
                description: "Get instant answers, explanations, and personalized study plans from our advanced AI tutor.",
                color: "purple",
                link: "ai"
              },
              {
                icon: "📚",
                title: "Smart Academics",
                description: "Organized curriculum, interactive notes, and progress tracking for all your subjects.",
                color: "blue",
                link: "academics"
              },
              {
                icon: "💼",
                title: "Career Preparation", 
                description: "Mock interviews, resume building, and placement assistance to land your dream job.",
                color: "green",
                link: "placements"
              },
              {
                icon: "🏆",
                title: "Competitions & Challenges",
                description: "Participate in coding contests, hackathons, and showcase your skills to recruiters.",
                color: "orange",
                link: "competitions"
              }
            ].map((feature, index) => (
              <div 
                key={index}
                className={`feature-card feature-card--${feature.color}`}
                id={`animate-feature-${index}`}
                onClick={() => onNavigate?.(isAuthed ? feature.link : "profile")}
              >
                <div className="feature-icon">
                  <div className="icon-bg"></div>
                  <span>{feature.icon}</span>
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
                <div className="feature-arrow">→</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Dashboard Preview */}
      <section className="dashboard-preview" id="animate-dashboard">
        <div className="container">
          <div className="preview-content">
            <div className="preview-text">
              <h2>Your Personal Learning Dashboard</h2>
              <p>Track progress, set goals, and stay motivated with our intuitive dashboard.</p>
              
              <div className="preview-features">
                <div className="preview-feature">
                  <div className="feature-icon-small">📈</div>
                  <span>Progress Analytics</span>
                </div>
                <div className="preview-feature">
                  <div className="feature-icon-small">🎯</div>
                  <span>Goal Setting</span>
                </div>
                <div className="preview-feature">
                  <div className="feature-icon-small">🔥</div>
                  <span>Streak Tracking</span>
                </div>
              </div>

              <button 
                className="btn-preview"
                onClick={() => onNavigate?.("profile")}
              >
                View Dashboard
              </button>
            </div>

            <div className="preview-visual">
              <div className="dashboard-mockup">
                <div className="mockup-header">
                  <div className="mockup-dots">
                    <span></span><span></span><span></span>
                  </div>
                </div>
                <div className="mockup-content">
                  <div className="progress-rings">
                    <div className="ring ring-1"></div>
                    <div className="ring ring-2"></div>
                    <div className="ring ring-3"></div>
                  </div>
                  <div className="activity-bars">
                    {[60, 80, 45, 90, 70, 95, 75].map((height, i) => (
                      <div key={i} className="bar" style={{ height: `${height}%` }}></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Enhanced */}
      <section className="cta-dynamic" id="animate-cta">
        <div className="cta-bg"></div>
        <div className="container">
          <div className="cta-content">
            <h2>Ready to Start Your Journey?</h2>
            <p>Join thousands of students who are already transforming their learning experience</p>
            
            <div className="cta-actions">
              <button 
                className="btn-cta-primary"
                onClick={() => onNavigate?.(isAuthed ? "ai" : "profile")}
              >
                Get Started Free
                <span className="btn-shine"></span>
              </button>
              <button 
                className="btn-cta-secondary"
                onClick={() => onNavigate?.("profile")}
              >
                Learn More
              </button>
            </div>

            <div className="trust-indicators">
              <div className="trust-item">
                <span className="trust-icon">⭐</span>
                <span>4.9/5 Rating</span>
              </div>
              <div className="trust-item">
                <span className="trust-icon">🔒</span>
                <span>Secure & Private</span>
              </div>
              <div className="trust-item">
                <span className="trust-icon">🚀</span>
                <span>Always Free</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

