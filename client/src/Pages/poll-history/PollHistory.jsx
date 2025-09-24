import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import {io}from "socket.io-client";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import backIcon from "../../assets/back.svg";
const someUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const socket = io(someUrl);

const PollHistoryPage = () => {
  const [polls, setPolls] = useState([]);
  const navigate = useNavigate();
  useEffect(() => {
        const getPolls = async () => {
          const teacherName = sessionStorage.getItem("username");
          try {
            // Use backend API: GET /api/teacher/polls?createdBy=teacherName
            const response = await axios.get(`${apiUrl}/api/teacher/polls?createdBy=${encodeURIComponent(teacherName)}`);
            setPolls(response.data.data || response.data); // support both array and {data:array}
          } catch (error) {
            console.error("Error fetching polls:", error);
          }
        };
        getPolls();
  }, []);

  const calculatePercentage = (count, totalVotes) => {
    if (totalVotes === 0) return 0;
    return (count / totalVotes) * 100;
  };
  const handleBack = () => {
    navigate("/teacher-home-page");
  };
  let questionCount = 0;

  return (
    <div className="container mt-5 w-50">
      <div className="mb-4 text-left">
        <img
        src={backIcon}
        alt=""
        width={"25px"}
        srcSet=""
        style={{ cursor: "pointer" }}
        onClick={handleBack}
        />{" "}
        View <b>Poll History</b>
      </div>
      {polls.length > 0 ? (
        polls.map((poll, pollIdx) => {
          const optionsArr = Array.isArray(poll.options) ? poll.options : [];
          const totalVotes = optionsArr.reduce(
            (sum, option) => sum + (option.votes || 0),
            0
          );

          return (
            <React.Fragment key={poll._id || pollIdx}>
              <div className="pb-3">{`Quetion ${++questionCount}`}</div>
              <div className="card mb-4">
                <div className="card-body">
                  <h6 className="question py-2 ps-2 text-left rounded text-white">
                    {poll.question} ?
                  </h6>
                  <div className="list-group mt-4">
                    {optionsArr.map((option, optIdx) => (
                      <div
                        key={option._id || option.text || optIdx}
                        className="list-group-item rounded m-2"
                      >
                        <div className="d-flex justify-content-between align-items-center">
                          <span>{option.text}</span>
                          <span>
                            {Math.round(
                              calculatePercentage(option.votes || 0, totalVotes)
                            )}
                            %
                          </span>
                        </div>
                        <div className="progress mt-2">
                          <div
                            className="progress-bar progress-bar-bg"
                            role="progressbar"
                            style={{
                              width: `${calculatePercentage(
                                option.votes || 0,
                                totalVotes
                              )}%`,
                            }}
                            aria-valuenow={option.votes || 0}
                            aria-valuemin="0"
                            aria-valuemax="100"
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })
      ) : (
        <div className="text-muted">polls not found</div>
      )}
    </div>
  );
};

export default PollHistoryPage;
