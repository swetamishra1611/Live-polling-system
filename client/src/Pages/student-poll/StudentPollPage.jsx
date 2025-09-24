import React, { useState, useEffect, useRef } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import io from "socket.io-client";
import "./StudentPollPage.css";
import stopwatch from "../../assets/stopwatch.svg";
import ChatPopover from "../../components/chat/ChatPopover";
import { useNavigate } from "react-router-dom";
import stars from "../../assets/spark.svg";

// This setup is good, no changes needed here.
// DELETE the old line.
// ADD these new lines.

const URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const socket = io(URL);

const StudentPollPage = () => {
  // CHANGE: We'll simplify state. This one object will hold all the poll info.
  const [livePollData, setLivePollData] = useState(null);
  
  const [selectedOption, setSelectedOption] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [kickedOut, setKickedOut] = useState(false);
  const timerRef = useRef(null);
  const navigate = useNavigate();

  const handleOptionSelect = (option) => {
    if (!submitted) {
      setSelectedOption(option);
    }
  };

  const handleSubmit = () => {
    if (selectedOption && livePollData) {
      const username = sessionStorage.getItem("username");
      const studentId = sessionStorage.getItem("studentId");
      if (username && studentId) {
        // CHANGE: We get the pollId from our new state object
        socket.emit("submitAnswer", {
          username: username,
          studentId: studentId,
          option: selectedOption,
          pollId: livePollData.pollId, // Use pollId from the live data
        });
        setSubmitted(true);
      } else {
        console.error("No username or studentId found in session storage!");
      }
    }
  };

  // This useEffect for registration and kickedOut is fine. No changes needed.
  useEffect(() => {
    const username = sessionStorage.getItem("username");
    let studentId = sessionStorage.getItem("studentId");
    if (username && !studentId) {
      fetch(`${apiUrl}/api/student/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: username }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data && data._id) {
            sessionStorage.setItem("studentId", data._id);
          }
        });
    }
    const handleKickedOut = () => {
      setKickedOut(true);
      sessionStorage.removeItem("username");
      sessionStorage.removeItem("studentId");
      navigate("/kicked-out");
    };
    socket.on("kickedOut", handleKickedOut);
    return () => socket.off("kickedOut", handleKickedOut);
  }, [navigate]);

  // CHANGE: We will consolidate all our polling socket listeners into one useEffect.
  useEffect(() => {
    // This handler is for when the teacher starts a brand new poll
    const handleNewQuestion = (data) => {
      console.log("New question received:", data);
      const { question } = data;
      // Set up the initial state for the new poll
      setLivePollData({
        question: question.text,
        options: question.options,
        pollId: question._id,
        results: [], // Results are initially empty
        totalVotes: 0,
      });
      // Reset everything for the new poll
      setSubmitted(false);
      setSelectedOption(null);
      setTimeLeft(
        question.expiresAt
          ? Math.max(0, Math.floor((new Date(question.expiresAt) - Date.now()) / 1000))
          : 60
      );
    };

    // This is the NEW listener for real-time vote updates
    const handlePollUpdate = (data) => {
      console.log("Poll update received!", data);
      setLivePollData(data); // Update the entire poll object with new results
    };

    socket.on("new-question", handleNewQuestion);
    socket.on("pollUpdated", handlePollUpdate); // Listen to the correct event

    // Cleanup listeners when the component unmounts
    return () => {
      socket.off("new-question", handleNewQuestion);
      socket.off("pollUpdated", handlePollUpdate);
    };
  }, []); // Empty array ensures this runs only once.

  // This timer useEffect is fine, no changes needed.
  useEffect(() => {
    if (timeLeft > 0 && !submitted) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(timerRef.current);
            setSubmitted(true);
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLeft, submitted]);

  return (
    <>
      <ChatPopover />
      {kickedOut ? (
        <div>kicked</div>
      ) : (
        <>
          {/* CHANGE: Simplified the waiting condition */}
          {!livePollData ? (
            <div className="d-flex justify-content-center align-items-center vh-100 w-75  mx-auto">
              <div className="student-landing-container text-center">
                <button className="btn btn-sm intervue-btn mb-5">
                  <img src={stars} className="px-1" alt="" /> Intervue Poll
                </button>
                <br />
                <div className="spinner-border text-center spinner" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <h3 className="landing-title">
                  <b>Wait for the teacher to ask questions..</b>
                </h3>
              </div>
            </div>
          ) : (
            <div className="container mt-5 w-50">
              <div className="d-flex align-items-center mb-4">
                <h5 className="m-0 pe-5">Question</h5>
                <img src={stopwatch} width="15px" height="auto" alt="Stopwatch" />
                <span className="ps-2 ml-2 text-danger">{timeLeft}s</span>
              </div>
              <div className="card">
                <div className="card-body">
                  <h6 className="question py-2 ps-2 float-left rounded text-white">
                    {livePollData.question}?
                  </h6>
                  {/* CHANGE: Condition to show voting options */}
                  {!submitted && timeLeft > 0 ? (
                    <div className="list-group mt-4">
                      {livePollData.options.map((option, idx) => (
                        <div
                          key={option || idx}
                          className={`list-group-item rounded m-1 ${
                            selectedOption === option
                              ? "border option-border option-clickable"
                              : "option-clickable"
                          }`}
                          onClick={() => handleOptionSelect(option)}
                        >
                          <span className="ml-2 text-left">{option}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    // CHANGE: Condition to show results. This will now update in real-time.
                    <>
                      <h5 className="mt-4 mb-2 text-center">Poll Results</h5>
                      <div className="list-group mt-2">
                        {livePollData.options.map((option, idx) => {
                          // Find the result for this option from our live data
                          const result = livePollData.results.find(res => res.option === option);
                          const voteCount = result ? result.count : 0;
                          const percentage = livePollData.totalVotes > 0
                              ? (voteCount / livePollData.totalVotes) * 100
                              : 0;
                          
                          return (
                            <div key={option || idx} className="list-group-item rounded m-1 option-disabled">
                              <div className="d-flex justify-content-between align-items-center">
                                <span className="ml-2 text-left font-weight-bold">{option}</span>
                                <span className="text-right">{Math.round(percentage)}%</span>
                              </div>
                              <div className="progress mt-2">
                                <div
                                  className="progress-bar progress-bar-bg"
                                  role="progressbar"
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>
              {!submitted && selectedOption && timeLeft > 0 && (
                <div className="d-flex justify-content-end align-items-center">
                  <button type="submit" className="btn continue-btn my-3 w-25" onClick={handleSubmit}>
                    Submit
                  </button>
                </div>
              )}
              {submitted && (
                <div className="mt-5">
                  <h6 className="text-center">Wait for the teacher to ask a new question...</h6>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
};

export default StudentPollPage;