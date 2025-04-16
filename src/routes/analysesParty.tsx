import { useContext, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import GlobalContext from "../contexts/globalContext";
import { TypeGlobalContext } from "../contexts/typeGlobalContext";
import axios from "axios";
import { UserModel } from "../models/user.model";
import { MessageModel } from "../models/message.model";
import { ActiveGameModel } from "../models/active-game.model";
import { ActivePartyModel } from "../models/active-party.model";
import { MoveModel } from "../models/move.model";
import { Chess, Move, Square } from "chess.js";
import { ErrorPage } from "../error-page";
import { Chessboard } from "react-chessboard";
import { io } from "socket.io-client";
import { Button, TextField } from "@mui/material";

export const AnalysesParty = () => {
  const [render, setRender] = useState<boolean>(true);
  const params = useParams();
  const contextValue = useContext(GlobalContext) as TypeGlobalContext;
  const [position, setPosition] = useState<string>("");
  const [opponent, setOpponent] = useState<UserModel | null>(null);
  const [messages, setMessages] = useState<MessageModel[]>([]);
  const [activeGame, setActiveGame] = useState<ActiveGameModel | null>(null);
  const [activeParty, setActiveParty] = useState<ActivePartyModel | null>(null);
  const [moves, setMoves] = useState<MoveModel[]>([]);
  const [userSide, setUserSide] = useState<string>("");
  const [moveFrom, setMoveFrom] = useState<string>("");
  const [moveTo, setMoveTo] = useState<Square | null>(null);
  const [optionSquares, setOptionSquares] = useState<any>({});
  const [showPromotionDialog, setShowPromotionDialog] = useState(false);
  const [suggestedMove, setSuggestedMove] = useState<string[]>([]);
  const [suggestedMoveLabel, setSuggestedMoveLabel] = useState<string>("");
  const [cp, setCp] = useState<string>("");
  const [currentMoveIndex, setCurrentMoveIndex] = useState<number>(0);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const socket = useRef(
    io("ws://localhost:3005", {
      // auth: {
      //   token: contextValue.sessionToken,
      // },
      // query: {
      //   hello: "world",
      //   test: true,
      // },
      // reconnection: false,
      autoConnect: false,
    }),
  );
  const chessLogic = useRef(new Chess());
  const navigation = useNavigate();
  useEffect(() => {
    (async () => {
      console.log(params);
      //console.log(document.cookie);
      //console.log(contextValue);
      if (params.uuid) {
        if (contextValue.sessionCredentials && contextValue.sessionToken) {
          console.log("Context exist, request to activeParty");
          axios.defaults.withCredentials = true;
          axios
            .post("http://localhost:8080/loadActiveGame", {
              token: contextValue.sessionToken,
              userUuid: contextValue.sessionCredentials.uuid,
              gameUuid: params.uuid,
            })
            .then((value) => {
              console.log(value);
              const activeParty = value.data.activeParty as ActivePartyModel;
              const activeGame = value.data.activeGame as ActiveGameModel;
              const messages = value.data.messages as MessageModel[];
              const opponent = value.data.opponent;
              const moves = (value.data.partyMoves as MoveModel[]).sort(
                (a, b) => a.index - b.index,
              );
              setPosition(value.data.activeParty.currentPos);
              if (value.data.activeParty.currentPos !== "start") {
                chessLogic.current.load(activeParty.currentPos);
              }
              setUserSide(
                activeGame.userWUuid === contextValue.sessionCredentials?.uuid
                  ? "w"
                  : "b",
              );
              setActiveGame(activeGame);
              setActiveParty(activeParty);
              setMessages(messages);
              setOpponent(opponent);
              setMoves(moves);
              setCurrentMoveIndex(
                moves.length
                  ? (moves.at(moves.length - 1) as MoveModel).index
                  : 0,
              );
              if (moves.length) {
                const optionSquares = {};
                // @ts-ignore
                optionSquares[
                  moves[(moves.at(moves.length - 1) as MoveModel).index - 1]
                    .from as string
                ] = {
                  background: "rgba(255, 255, 0, 0.4)",
                };
                // @ts-ignore
                optionSquares[
                  moves[(moves.at(moves.length - 1) as MoveModel).index - 1]
                    .to as string
                ] = {
                  background: "rgba(255, 255, 0, 0.4)",
                };
                setOptionSquares(optionSquares);
              }
              socket.current = io("ws://localhost:3005", {
                auth: {
                  token: contextValue.sessionToken,
                },
                query: {
                  event: "analysesGame",
                },
                reconnection: false,
                autoConnect: false,
              });
              socket.current.connect();
              socket.current.on("connect", () => {
                console.log("Socket connection success?");
                if (!chessLogic.current.isGameOver()) {
                  socket.current.emit("position", {
                    position: chessLogic.current.fen(),
                  });
                }
              });
              socket.current.on("connect_error", (err) => {
                console.error(
                  "Error when attempt to connect to server socket:",
                );
                console.log(err);
              });
              socket.current.on("disconnect", (reason, description) => {
                console.log("Socket dsiconnected:");
                console.log(reason);
              });
              socket.current.on("move", (args) => {
                console.log("On stockfish suggest move:");
                console.log(args);
                try {
                  const copyChess = new Chess(chessLogic.current.fen());
                  copyChess.move(args.move);
                  const suggestedMove = copyChess.history({ verbose: true });
                  setSuggestedMove([
                    (suggestedMove.at(suggestedMove.length - 1) as Move).from,
                    (suggestedMove.at(suggestedMove.length - 1) as Move).to,
                    "rgb(245, 192, 0)",
                  ]);
                  setSuggestedMoveLabel(args.move);
                  if (chessLogic.current.turn() === "w") {
                    if (args.mate) {
                      setCp(` #${args.mate}`);
                    } else {
                      if (args.cp) {
                        setCp(
                          args.cp >= 0
                            ? ` +${(args.cp / 100).toFixed(1)}`
                            : ` ${(args.cp / 100).toFixed(1)}`,
                        );
                      } else {
                        console.log(
                          "Misunderstandable mistake!!!!!!!!!!!!!!!!!!!!!!!!!!!!!",
                        );
                      }
                    }
                  } else {
                    if (args.mate) {
                      setCp(` #${args.mate * -1}`);
                    } else {
                      if (args.cp) {
                        setCp(
                          args.cp >= 0
                            ? ` -${(args.cp / 100).toFixed(1)}`
                            : ` +${((args.cp * -1) / 100).toFixed(1)}`,
                        );
                      } else {
                        console.log(
                          "Misunderstandable mistake!!!!!!!!!!!!!!!!!!!!!!!!!!!!!",
                        );
                      }
                    }
                  }
                } catch (e) {
                  console.log("ERROR:");
                  console.log(e);
                }
              });
              socket.current.on("bestmove", (args) => {
                console.log("On stockfish suggest BESTmove:");
                console.log(args);
                try {
                  const copyChess = new Chess(chessLogic.current.fen());
                  copyChess.move(args.move);
                  const suggestedMove = copyChess.history({ verbose: true });
                  setSuggestedMove([
                    (suggestedMove.at(suggestedMove.length - 1) as Move).from,
                    (suggestedMove.at(suggestedMove.length - 1) as Move).to,
                    "rgb(245, 192, 0)",
                  ]);
                  setSuggestedMoveLabel(args.move);
                  if (chessLogic.current.turn() === "w") {
                    if (args.mate) {
                      setCp(` #${args.mate}`);
                    } else {
                      if (args.cp) {
                        setCp(
                          args.cp >= 0
                            ? ` +${(args.cp / 100).toFixed(1)}`
                            : ` ${(args.cp / 100).toFixed(1)}`,
                        );
                      } else {
                        console.log(
                          "Misunderstandable mistake!!!!!!!!!!!!!!!!!!!!!!!!!!!!!",
                        );
                      }
                    }
                  } else {
                    if (args.mate) {
                      setCp(` #${args.mate * -1}`);
                    } else {
                      if (args.cp) {
                        setCp(
                          args.cp >= 0
                            ? ` -${(args.cp / 100).toFixed(1)}`
                            : ` +${((args.cp * -1) / 100).toFixed(1)}`,
                        );
                      } else {
                        console.log(
                          "Misunderstandable mistake!!!!!!!!!!!!!!!!!!!!!!!!!!!!!",
                        );
                      }
                    }
                  }
                } catch (e) {
                  console.log("ERROR:");
                  console.log(e);
                }
              });
              socket.current.on("Error", (args) => {
                console.log("Server send error:");
                console.log(args);
              });
              socket.current.on("serverError", (args) => {
                console.log("Server send serverError:");
                console.log(args);
              });
              socket.current.on("clientError", (args) => {
                console.log("Server send clientError:");
                console.log(args);
              }); //TODO add the same in auth after cookie
            })
            .catch((reason) => {
              console.log("`ERROR when loading activeGame:");
              console.log(reason);
              console.error(reason);
            });
        } else {
          console.log("No context detected, request to auth with cookies");
          axios.defaults.withCredentials = true;
          axios
            .post("http://localhost:8080/auth")
            .then((value) => {
              console.log("Success auth with cookie");
              console.log(value);
              contextValue.sessionToken = value.data.sessionToken;
              contextValue.sessionCredentials = {
                ...value.data.userData,
              };
              setRender((prevState) => !prevState);
              //axios.defaults.withCredentials = true;
              axios
                .post("http://localhost:8080/loadActiveGame", {
                  token: contextValue.sessionToken,
                  userUuid: contextValue.sessionCredentials?.uuid,
                  gameUuid: params.uuid,
                })
                .then((value) => {
                  console.log(value);
                  const activeParty = value.data
                    .activeParty as ActivePartyModel;
                  const activeGame = value.data.activeGame as ActiveGameModel;
                  const messages = value.data.messages as MessageModel[];
                  const opponent = value.data.opponent;
                  const moves = (value.data.partyMoves as MoveModel[]).sort(
                    (a, b) => a.index - b.index,
                  );
                  setPosition(value.data.activeParty.currentPos);
                  if (value.data.activeParty.currentPos !== "start") {
                    chessLogic.current.load(activeParty.currentPos);
                  }
                  setUserSide(
                    activeGame.userWUuid ===
                      contextValue.sessionCredentials?.uuid
                      ? "w"
                      : "b",
                  );
                  setActiveGame(activeGame);
                  setActiveParty(activeParty);
                  setMessages(messages);
                  setOpponent(opponent);
                  setMoves(moves);
                  setCurrentMoveIndex(
                    moves.length
                      ? (moves.at(moves.length - 1) as MoveModel).index
                      : 1,
                  );
                  if (moves.length) {
                    const optionSquares = {};
                    // @ts-ignore
                    optionSquares[
                      moves[(moves.at(moves.length - 1) as MoveModel).index - 1]
                        .from as string
                    ] = {
                      background: "rgba(255, 255, 0, 0.4)",
                    };
                    // @ts-ignore
                    optionSquares[
                      moves[(moves.at(moves.length - 1) as MoveModel).index - 1]
                        .to as string
                    ] = {
                      background: "rgba(255, 255, 0, 0.4)",
                    };
                    setOptionSquares(optionSquares);
                  }
                  socket.current = io("ws://localhost:3005", {
                    auth: {
                      token: contextValue.sessionToken,
                    },
                    query: {
                      event: "analysesGame",
                    },
                    reconnection: false,
                    autoConnect: false,
                  });
                  socket.current.connect();
                  socket.current.on("connect", () => {
                    console.log("Socket connection success?");
                    if (!chessLogic.current.isGameOver()) {
                      socket.current.emit("position", {
                        position: chessLogic.current.fen(),
                      });
                    }
                  });
                  socket.current.on("connect_error", (err) => {
                    console.error(
                      "Error when attempt to connect to server socket:",
                    );
                    console.log(err);
                  });
                  socket.current.on("disconnect", (reason, description) => {
                    console.log("Socket dsiconnected:");
                    console.log(reason);
                  });
                  socket.current.on("move", (args) => {
                    console.log("On stockfish suggest move:");
                    console.log(args);
                    try {
                      const copyChess = new Chess(chessLogic.current.fen());
                      copyChess.move(args.move);
                      const suggestedMove = copyChess.history({
                        verbose: true,
                      });
                      setSuggestedMove([
                        (suggestedMove.at(suggestedMove.length - 1) as Move)
                          .from,
                        (suggestedMove.at(suggestedMove.length - 1) as Move).to,
                        "rgb(245, 192, 0)",
                      ]);
                      setSuggestedMoveLabel(args.move);
                      if (chessLogic.current.turn() === "w") {
                        if (args.mate) {
                          setCp(` #${args.mate}`);
                        } else {
                          if (args.cp) {
                            setCp(
                              args.cp >= 0
                                ? ` +${(args.cp / 100).toFixed(1)}`
                                : ` ${(args.cp / 100).toFixed(1)}`,
                            );
                          } else {
                            console.log(
                              "Misunderstandable mistake!!!!!!!!!!!!!!!!!!!!!!!!!!!!!",
                            );
                          }
                        }
                      } else {
                        if (args.mate) {
                          setCp(` #${args.mate * -1}`);
                        } else {
                          if (args.cp) {
                            setCp(
                              args.cp >= 0
                                ? ` -${(args.cp / 100).toFixed(1)}`
                                : ` +${((args.cp * -1) / 100).toFixed(1)}`,
                            );
                          } else {
                            console.log(
                              "Misunderstandable mistake!!!!!!!!!!!!!!!!!!!!!!!!!!!!!",
                            );
                          }
                        }
                      }
                    } catch (e) {
                      console.log("ERROR:");
                      console.log(e);
                    }
                  });
                  socket.current.on("bestmove", (args) => {
                    console.log("On stockfish suggest BESTmove:");
                    console.log(args);
                    try {
                      const copyChess = new Chess(chessLogic.current.fen());
                      copyChess.move(args.move);
                      const suggestedMove = copyChess.history({
                        verbose: true,
                      });
                      setSuggestedMove([
                        (suggestedMove.at(suggestedMove.length - 1) as Move)
                          .from,
                        (suggestedMove.at(suggestedMove.length - 1) as Move).to,
                        "rgb(245, 192, 0)",
                      ]);
                      setSuggestedMoveLabel(args.move);
                      if (chessLogic.current.turn() === "w") {
                        if (args.mate) {
                          setCp(` #${args.mate}`);
                        } else {
                          if (args.cp) {
                            setCp(
                              args.cp >= 0
                                ? ` +${(args.cp / 100).toFixed(1)}`
                                : ` ${(args.cp / 100).toFixed(1)}`,
                            );
                          } else {
                            console.log(
                              "Misunderstandable mistake!!!!!!!!!!!!!!!!!!!!!!!!!!!!!",
                            );
                          }
                        }
                      } else {
                        if (args.mate) {
                          setCp(` #${args.mate * -1}`);
                        } else {
                          if (args.cp) {
                            setCp(
                              args.cp >= 0
                                ? ` -${(args.cp / 100).toFixed(1)}`
                                : ` +${((args.cp * -1) / 100).toFixed(1)}`,
                            );
                          } else {
                            console.log(
                              "Misunderstandable mistake!!!!!!!!!!!!!!!!!!!!!!!!!!!!!",
                            );
                          }
                        }
                      }
                    } catch (e) {
                      console.log("ERROR:");
                      console.log(e);
                    }
                  });
                  socket.current.on("Error", (args) => {
                    console.log("Server send error:");
                    console.log(args);
                  });
                  socket.current.on("serverError", (args) => {
                    console.log("Server send serverError:");
                    console.log(args);
                  });
                  socket.current.on("clientError", (args) => {
                    console.log("Server send clientError:");
                    console.log(args);
                  });
                })
                .catch((reason) => {
                  console.log("`ERROR when loading activeGame:");
                  console.log(reason);
                  console.error(reason);
                });
            })
            .catch((reason) => {
              console.log(
                `Error with aith with cookie, renavigate to homePage`,
              );
              console.error(reason);
              navigation("/", {
                replace: true,
              });
            });
        }
      } else {
        console.log("Incognito analyses");
        // axios.defaults.withCredentials = true;
        // axios
        //   .post("http://localhost:8080/loadActiveGame", {
        //     token: contextValue.sessionToken,
        //     userUuid: contextValue.sessionCredentials.uuid,
        //     gameUuid: params.uuid,
        //   })
        //   .then((value) => {
        //     console.log(value);
        //     const activeParty = value.data.activeParty as ActivePartyModel;
        //     const activeGame = value.data.activeGame as ActiveGameModel;
        //     const messages = value.data.messages as MessageModel[];
        //     const opponent = value.data.opponent;
        //     const moves = (value.data.partyMoves as MoveModel[]).sort(
        //       (a, b) => a.index - b.index,
        //     );
        setPosition("start");
        // if (value.data.activeParty.currentPos !== "start") {
        //   chessLogic.current.load(activeParty.currentPos);
        // }
        // setUserSide(
        //   activeGame.userWUuid === contextValue.sessionCredentials?.uuid
        //     ? "w"
        //     : "b",
        // );
        // setActiveGame(activeGame);
        // setActiveParty(activeParty);
        // setMessages(messages);
        // setOpponent(opponent);
        //setMoves(moves);
        setCurrentMoveIndex(
          /*moves.length ? (moves.at(moves.length - 1) as MoveModel).index :*/ 0,
        );
        socket.current = io("ws://localhost:3005", {
          // auth: {
          //   token: contextValue.sessionToken,
          // },
          query: {
            event: "analysesGame",
          },
          reconnection: false,
          autoConnect: false,
        });
        socket.current.connect();
        socket.current.on("connect", () => {
          console.log("Socket connection success?");
          socket.current.emit("position", {
            position: chessLogic.current.fen(),
          });
        });
        socket.current.on("connect_error", (err) => {
          console.error("Error when attempt to connect to server socket:");
          console.log(err);
        });
        socket.current.on("disconnect", (reason, description) => {
          console.log("Socket dsiconnected:");
          console.log(reason);
        });
        socket.current.on("move", (args) => {
          console.log("On stockfish suggest move:");
          console.log(args);
          try {
            const copyChess = new Chess(chessLogic.current.fen());
            copyChess.move(args.move);
            const suggestedMove = copyChess.history({ verbose: true });
            setSuggestedMove([
              (suggestedMove.at(suggestedMove.length - 1) as Move).from,
              (suggestedMove.at(suggestedMove.length - 1) as Move).to,
              "rgb(245, 192, 0)",
            ]);
            setSuggestedMoveLabel(args.move);
            if (chessLogic.current.turn() === "w") {
              if (args.mate) {
                setCp(` #${args.mate}`);
              } else {
                if (args.cp) {
                  setCp(
                    args.cp >= 0
                      ? ` +${(args.cp / 100).toFixed(1)}`
                      : ` ${(args.cp / 100).toFixed(1)}`,
                  );
                } else {
                  console.log(
                    "Misunderstandable mistake!!!!!!!!!!!!!!!!!!!!!!!!!!!!!",
                  );
                }
              }
            } else {
              if (args.mate) {
                setCp(` #${args.mate * -1}`);
              } else {
                if (args.cp) {
                  setCp(
                    args.cp >= 0
                      ? ` -${(args.cp / 100).toFixed(1)}`
                      : ` +${((args.cp * -1) / 100).toFixed(1)}`,
                  );
                } else {
                  console.log(
                    "Misunderstandable mistake!!!!!!!!!!!!!!!!!!!!!!!!!!!!!",
                  );
                }
              }
            }
          } catch (e) {
            console.log("ERROR:");
            console.log(e);
          }
        });
        socket.current.on("bestmove", (args) => {
          console.log("On stockfish suggest BESTmove:");
          console.log(args);
          try {
            const copyChess = new Chess(chessLogic.current.fen());
            copyChess.move(args.move);
            const suggestedMove = copyChess.history({ verbose: true });
            setSuggestedMove([
              (suggestedMove.at(suggestedMove.length - 1) as Move).from,
              (suggestedMove.at(suggestedMove.length - 1) as Move).to,
              "rgb(245, 192, 0)",
            ]);
            setSuggestedMoveLabel(args.move);
            if (chessLogic.current.turn() === "w") {
              if (args.mate) {
                setCp(` #${args.mate}`);
              } else {
                if (args.cp) {
                  setCp(
                    args.cp >= 0
                      ? ` +${(args.cp / 100).toFixed(1)}`
                      : ` ${(args.cp / 100).toFixed(1)}`,
                  );
                } else {
                  console.log(
                    "Misunderstandable mistake!!!!!!!!!!!!!!!!!!!!!!!!!!!!!",
                  );
                }
              }
            } else {
              if (args.mate) {
                setCp(` #${args.mate * -1}`);
              } else {
                if (args.cp) {
                  setCp(
                    args.cp >= 0
                      ? ` -${(args.cp / 100).toFixed(1)}`
                      : ` +${((args.cp * -1) / 100).toFixed(1)}`,
                  );
                } else {
                  console.log(
                    "Misunderstandable mistake!!!!!!!!!!!!!!!!!!!!!!!!!!!!!",
                  );
                }
              }
            }
          } catch (e) {
            console.log("ERROR:");
            console.log(e);
          }
        });
        socket.current.on("Error", (args) => {
          console.log("Server send error:");
          console.log(args);
        });
        socket.current.on("serverError", (args) => {
          console.log("Server send serverError:");
          console.log(args);
        });
        socket.current.on("clientError", (args) => {
          console.log("Server send clientError:");
          console.log(args);
        }); //TODO add the same in auth after cookie
        // })
        // .catch((reason) => {
        //   console.log("`ERROR when loading activeGame:");
        //   console.log(reason);
        //   console.error(reason);
        // });
      }
    })();
    return () => {
      if (socket.current.connected) {
        socket.current.disconnect();
      }
    };
  }, []);
  const getMoveOptions = (square: Square) => {
    const moves = chessLogic.current.moves({
      square,
      verbose: true,
    });
    // if (moves.length === 0) {
    //   setOptionSquares({});
    // }
    const newSquares = {};
    moves.map((move) => {
      // @ts-ignore
      newSquares[move.to] = {
        background:
          chessLogic.current.get(move.to) &&
          chessLogic.current.get(move.to).color !==
            chessLogic.current.get(square).color
            ? "radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)"
            : "radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)",
        borderRadius: "50%",
      };
      return move;
    });
    // @ts-ignore
    // newSquares[square] = {
    //   background: "rgba(255, 255, 0, 0.4)",
    // };
    // setOptionSquares(newSquares);
    return newSquares;
  };
  const onSquareClick = (square: Square) => {
    const globalMoves = [...moves];
    // if (userSide !== chessLogic.current.turn()) {
    //   return;
    // }
    if (moveFrom === square) {
      setMoveFrom("");
      setOptionSquares({});
      return;
    }
    // from square
    if (!moveFrom) {
      if (chessLogic.current.get(square)?.color === chessLogic.current.turn()) {
        const hasMoveOptions: any = getMoveOptions(square);
        hasMoveOptions[square] = {
          background: "rgba(255, 255, 0, 0.4)",
        };
        setMoveFrom(square);
        setOptionSquares(hasMoveOptions);
      }
      return;
    }

    // to square
    if (!moveTo) {
      // check if valid move before showing dialog
      const moves = chessLogic.current.moves({
        square: moveFrom as Square,
        verbose: true,
      });
      const foundMove = moves.find(
        (m) => m.from === moveFrom && m.to === square,
      );
      // not a valid move
      if (!foundMove) {
        if (
          chessLogic.current.get(square)?.color === chessLogic.current.turn()
        ) {
          const hasMoveOptions: any = getMoveOptions(square);
          hasMoveOptions[square] = {
            background: "rgba(255, 255, 0, 0.4)",
          };
          setMoveFrom(square);
          setOptionSquares(hasMoveOptions);
        }
        return;
      }

      // valid move
      setMoveTo(square);

      // if promotion move
      if (
        (foundMove.color === "w" &&
          foundMove.piece === "p" &&
          square[1] === "8") ||
        (foundMove.color === "b" &&
          foundMove.piece === "p" &&
          square[1] === "1")
      ) {
        setShowPromotionDialog(true);
        return;
      }

      // is normal move
      try {
        chessLogic.current.move({
          from: moveFrom,
          to: square,
        });
        setPosition(chessLogic.current.fen());
        setSuggestedMove([]);
        const history = chessLogic.current.history({
          verbose: true,
        });
        if (
          globalMoves.length &&
          (globalMoves.at(globalMoves.length - 1) as MoveModel).index >
            currentMoveIndex
        ) {
          setMoves([
            ...globalMoves.filter((value) => {
              return !(value.index > currentMoveIndex);
            }),
            {
              ...history[history.length - 1],
              index:
                chessLogic.current.turn() === "b"
                  ? chessLogic.current.moveNumber() * 2 - 1
                  : chessLogic.current.moveNumber() * 2 - 2,
            } as MoveModel,
          ]);
        } else {
          setMoves((prevState) => {
            return [
              ...prevState,
              {
                ...history[history.length - 1],
                index:
                  chessLogic.current.turn() === "b"
                    ? chessLogic.current.moveNumber() * 2 - 1
                    : chessLogic.current.moveNumber() * 2 - 2,
              } as MoveModel,
            ];
          });
        }
        setCurrentMoveIndex(
          chessLogic.current.turn() === "b"
            ? chessLogic.current.moveNumber() * 2 - 1
            : chessLogic.current.moveNumber() * 2 - 2,
        );
        if (socket.current.connected) {
          const history = chessLogic.current.history({
            verbose: true,
          });
          if (!chessLogic.current.isGameOver()) {
            socket.current.emit("position", {
              position: chessLogic.current.fen(),
            });
          }
        }
      } catch (e: any) {
        // if invalid, setMoveFrom and getMoveOptions
        console.log("Error when move():");
        console.log(e);
        setMoveTo(null);
        return;
      }

      setMoveFrom("");
      setMoveTo(null);
      setOptionSquares({});
      return;
    }
  };
  const onPromotionPieceSelect = (piece: any) => {
    // if no piece passed then user has cancelled dialog, don't make move and reset
    console.log(piece);
    if (piece) {
      chessLogic.current.move({
        from: moveFrom,
        to: moveTo as Square,
        promotion: piece[1].toLowerCase() ?? "q",
      });
      setPosition(chessLogic.current.fen());
    }

    setMoveFrom("");
    setMoveTo(null);
    setShowPromotionDialog(false);
    setOptionSquares({});
    return true;
  };
  useEffect(() => {
    const history = chessLogic.current.history({
      verbose: true,
    });
    if (history.length === 0) {
      return;
    }
    const options = {};
    // @ts-ignore
    options[history[history.length - 1].from] = {
      background: "rgba(255, 255, 0, 0.4)",
    };
    // @ts-ignore
    options[history[history.length - 1].to] = {
      background: "rgba(255, 255, 0, 0.4)",
    };
    setOptionSquares(options);
    setRender((prevState) => !prevState);
  }, [position]);
  useEffect(() => {
    if (
      Object.keys(optionSquares).length === 0 &&
      chessLogic.current.history({ verbose: true }).length !== 0 &&
      currentMoveIndex !== 0
    ) {
      const lastMoves = chessLogic.current.history({ verbose: true });
      const optionSquares = {};
      // @ts-ignore
      optionSquares[lastMoves[lastMoves.length - 1].from] = {
        background: "rgba(255, 255, 0, 0.4)",
      };
      // @ts-ignore
      optionSquares[lastMoves[lastMoves.length - 1].to] = {
        background: "rgba(255, 255, 0, 0.4)",
      };
      setOptionSquares(optionSquares);
    } else {
      if (
        Object.keys(optionSquares).length === 0 &&
        chessLogic.current.history({ verbose: true }).length === 0 &&
        currentMoveIndex !== 0
      ) {
        const optionSquares = {};
        // @ts-ignore
        optionSquares[moves[currentMoveIndex - 1].from] = {
          background: "rgba(255, 255, 0, 0.4)",
        };
        // @ts-ignore
        optionSquares[moves[currentMoveIndex - 1].to] = {
          background: "rgba(255, 255, 0, 0.4)",
        };
        setOptionSquares(optionSquares);
      }
    }
  }, [optionSquares]);
  /*!contextValue.sessionToken ? (
    <ErrorPage />
  ) : */
  return (
    <div
      style={{
        margin: "3rem auto",
        maxWidth: "70vh",
        width: "70vw",
      }}
    >
      <h1>Анализ игры</h1>
      <Chessboard
        arePiecesDraggable={false}
        animationDuration={200}
        position={position}
        onPieceDragBegin={(piece, sourceSquare) => {
          console.log(sourceSquare);
        }}
        boardOrientation={
          activeGame?.userWUuid === contextValue?.sessionCredentials?.uuid
            ? "white"
            : "black"
        }
        onSquareClick={onSquareClick}
        onPromotionPieceSelect={onPromotionPieceSelect}
        customBoardStyle={{
          borderRadius: "4px",
          boxShadow: "0 2px 10px rgba(0, 0, 0, 0.5)",
        }}
        customSquareStyles={{
          ...optionSquares,
        }}
        promotionToSquare={moveTo}
        showPromotionDialog={showPromotionDialog}
        // @ts-ignore
        customArrows={suggestedMove ? [suggestedMove] : []}
      />
      <Button
        sx={{
          width: "200px",
          position: "absolute",
          left: "20px",
          top: "30px",
        }}
        onClick={() => {
          console.log("Move back to main menu clicked");
          navigation("/", {
            replace: true,
          });
        }}
      >
        Вернуться в главное меню
      </Button>
      <h3
        style={{
          position: "absolute",
          width: "300px",
          left: "20px",
          top: "210px",
        }}
      >
        {`Лучший ход: ${suggestedMoveLabel}`}
      </h3>
      <h3
        style={{
          position: "absolute",
          width: "300px",
          left: "20px",
          top: "310px",
        }}
      >
        {`Оценка позиции: ${cp}`}
      </h3>
      {chessLogic.current.isGameOver() ? (
        <h3
          style={{
            position: "absolute",
            width: "300px",
            left: "20px",
            top: "410px",
          }}
        >
          {chessLogic.current.isDraw()
            ? "Ничья"
            : chessLogic.current.turn() === "w"
              ? "Мат. Победа чёрных"
              : "Мат. Победа белых"}
        </h3>
      ) : null}
      <div
        style={{
          marginLeft: "10%",
          //marginTop: "2%",
          top: "125px",
          left: "930px",
          position: "absolute",
          width: "15%",
          height: "100%",
        }}
      >
        <h3>{`Шахматная история ${moves.length}`}</h3>
        <div style={{ width: "100%", height: "450px", overflow: "auto" }}>
          {moves.map((value) => {
            return (
              <TextField
                key={value.after}
                defaultValue={
                  value.index + ". " + value.piece + value.from + value.to
                }
                InputProps={{
                  readOnly: true,
                }}
                sx={{ width: "100%" }}
                onClick={() => {
                  setCurrentMoveIndex(value.index);
                  chessLogic.current.load(value.after as string);
                  setPosition(value.after as string);
                  setMoveFrom("");
                  setMoveTo(null);
                  setOptionSquares({}); //TODO
                  setSuggestedMove([]);
                  if (socket.current.connected) {
                    const history = chessLogic.current.history({
                      verbose: true,
                    });
                    if (!chessLogic.current.isGameOver()) {
                      socket.current.emit("position", {
                        position: chessLogic.current.fen(),
                      });
                    }
                  }
                }}
              ></TextField>
            );
          })}
        </div>
      </div>
    </div>
  );
};
