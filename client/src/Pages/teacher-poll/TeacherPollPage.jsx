import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import {io} from "socket.io-client";
import ChatPopover from "../../components/chat/ChatPopover";
import { useNavigate } from "react-router-dom";
import eyeIcon from "../../assets/eye.svg";

// This setup is good, no changes needed.
// DELETE the old line.
// ADD these new lines.

const someUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const socket = io(someUrl);

const TeacherPollPage = () => {
  // CHANGE: We will use a single state object to hold all live poll data.
  const [livePollData, setLivePollData] = useState(null);

  const navigate = useNavigate();

  // CHANGE: We consolidate all socket listeners into one clean useEffect.
  useEffect(() => {
    // This handler runs when the teacher has just created a new poll
    const handleNewQuestion = (data) => {
      const { question } = data;
      console.log('Teacher view received new-question:', question);
      // Set the initial state for the poll, results will be empty at first
      setLivePollData({
        question: question.text,
        options: question.options,
        results: [],
        totalVotes: 0,
      });
    };

    // This is the NEW listener that receives real-time vote updates
    const handlePollUpdate = (data) => {
      console.log('Teacher view received poll update:', data);
      setLivePollData(data); // Update the state with the latest results
    };

    // Start listening for both events
    socket.on("new-question", handleNewQuestion);
    socket.on("pollUpdated", handlePollUpdate);

    // Cleanup listeners when the component is no longer on screen
    return () => {
      socket.off("new-question", handleNewQuestion);
      socket.off("pollUpdated", handlePollUpdate);
    };
  }, []); // The empty array [] ensures this effect runs only once.

  const askNewQuestion = () => {
    navigate("/teacher-home-page");
  };

  const handleViewPollHistory = () => {
    navigate("/teacher-poll-history");
  };

  return (
    <>
      <button
        className="btn rounded-pill ask-question poll-history px-4 m-2"
        onClick={handleViewPollHistory}
      >
        <img src={eyeIcon} alt="" />
        View Poll history
      </button>
      <br />
      <div className="container mt-5 w-50">
        <h3 className="mb-4 text-center">Poll Results</h3>

        {/* CHANGE: The entire display is now driven by the livePollData state */}
        {!livePollData ? (
          <div className="text-center text-muted mt-4">
            Waiting for poll results...
          </div>
        ) : (
          <>
            <div className="card">
              <div className="card-body">
                <h6 className="question py-2 ps-2 text-left rounded text-white">
                  {livePollData.question} ?
                </h6>
                <div className="list-group mt-4">
                  {livePollData.options.map((option, idx) => {
                    // Find the result for this specific option from our live data
                    const result = livePollData.results.find(res => res.option === option);
                    const voteCount = result ? result.count : 0;
                    const percentage = livePollData.totalVotes > 0
                        ? (voteCount / livePollData.totalVotes) * 100
                        : 0;

                    return (
                      <div key={option || idx} className="list-group-item rounded m-2">
                        <div className="d-flex justify-content-between align-items-center">
                          <span>{option}</span>
                          <span>{Math.round(percentage)}%</span>
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
              </div>
            </div>
            {/* The teacher can ask a new question as soon as a poll is active */}
            <div>
              <button
                className="btn rounded-pill ask-question px-4 m-2"
                onClick={askNewQuestion}
              >
                + Ask a new question
              </button>
            </div>
          </>
        )}
        <ChatPopover />
      </div>
    </>
  );
};

export default TeacherPollPage;