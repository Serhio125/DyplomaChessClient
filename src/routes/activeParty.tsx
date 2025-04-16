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
import { Chess, Square } from "chess.js";
import { ErrorPage } from "../error-page";
import { Chessboard } from "react-chessboard";
import { io } from "socket.io-client";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import {
  Widget,
  addResponseMessage,
  addUserMessage,
  deleteMessages,
} from "react-chat-widget";
import "react-chat-widget/lib/styles.css";
import dayjs, { isDayjs } from "dayjs";
import DoneIcon from "@mui/icons-material/Done";
import ClearIcon from "@mui/icons-material/Clear";
export const ActiveParty = () => {
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
  const [currentMoveIndex, setCurrentMoveIndex] = useState<number>(0);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isGameOverDialog, setIsGameOverDialog] = useState<boolean>(false);
  const [gameResult, setGameResult] = useState<string>("");
  const [isSurrender, setIsSurrender] = useState<boolean>(false);
  const [isDrawSuggested, setIsDrawSuggested] = useState<boolean>(false);
  const [isTakebreakRequest, setIsTakebreakRequest] = useState<boolean>(false);
  const [isReportContentDialog, setIsReportContentDialog] =
    useState<boolean>(false);
  const [reportContent, setReportContent] = useState<string>("");
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
            const messages = (value.data.messages as MessageModel[]).sort(
              (a, b) => (dayjs(a.createdAt).isAfter(b.createdAt) ? 1 : -1),
            );
            deleteMessages(100);
            messages.forEach((value) => {
              value.srcUserUuid === contextValue.sessionCredentials?.uuid
                ? addUserMessage(value.content)
                : addResponseMessage(value.content);
            });
            const opponent = value.data.opponent;
            const moves = (value.data.partyMoves as MoveModel[]).sort(
              (a, b) => a.index - b.index,
            );
            setCurrentMoveIndex(
              moves.length
                ? (moves.at(moves.length - 1) as MoveModel).index
                : 0,
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
                event: "activeGame",
                gameUuid: activeGame?.uuid,
                userUuid: contextValue.sessionCredentials?.uuid,
              },
              reconnection: false,
              autoConnect: false,
            });
            socket.current.connect();
            socket.current.on("connect", () => {
              console.log("Socket connection success?");
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
              console.log("On emit move data:");
              console.log(args);
              setPosition(args.position);
              setMoves((prevState) => [...prevState, args.move]);
              setCurrentMoveIndex((args.move as MoveModel).index);
              chessLogic.current.load(args.position);
              setOptionSquares({});
            });
            socket.current.on("message", (data) => {
              console.log("On emit message data:");
              console.log(data);
              addResponseMessage(data.message);
            });
            socket.current.on("gameover", (data) => {
              console.log("On emit gameover data:");
              console.log(data);
              setIsGameOver(true);
              setIsGameOverDialog(true);
              setGameResult(data.result);
            });
            socket.current.on("drawsuggest", () => {
              console.log("On emit drawsuggest data:");
              setIsDrawSuggested(true);
            });
            socket.current.on("takebackrequest", () => {
              console.log("On emit takebackrequest data:");
              setIsTakebreakRequest(true);
            });
            socket.current.on("takeback", (data: any) => {
              console.log("On emit takeback data:");
              console.log(data);
              setPosition(data.move.after as string);
              setMoves((prevState) => {
                const prev = [...prevState.slice(0, data.move.index)];
                console.log(prev);
                return prev;
              }); //TODO NEED CHEEEECK
              setCurrentMoveIndex(data.move.index);
              chessLogic.current.load(data.move.after as string);
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
                const activeParty = value.data.activeParty as ActivePartyModel;
                const activeGame = value.data.activeGame as ActiveGameModel;
                const messages = (value.data.messages as MessageModel[]).sort(
                  (a, b) => (dayjs(a.createdAt).isAfter(b.createdAt) ? 1 : -1),
                );
                messages.forEach((value) => {
                  value.srcUserUuid === contextValue.sessionCredentials?.uuid
                    ? addUserMessage(value.content)
                    : addResponseMessage(value.content);
                });
                const opponent = value.data.opponent;
                const moves = (value.data.partyMoves as MoveModel[]).sort(
                  (a, b) => a.index - b.index,
                );
                setCurrentMoveIndex(
                  moves.length
                    ? (moves.at(moves.length - 1) as MoveModel).index
                    : 0,
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
                    event: "activeGame",
                    gameUuid: activeGame?.uuid,
                    userUuid: contextValue.sessionCredentials?.uuid,
                  },
                  reconnection: false,
                  autoConnect: false,
                });
                socket.current.connect();
                socket.current.on("connect", () => {
                  console.log("Socket connection success?");
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
                  console.log("On emit move data:");
                  console.log(args);
                  setPosition(args.position);
                  setMoves((prevState) => {
                    const prev = [...prevState, args.move as MoveModel];
                    console.log(prev);
                    return prev;
                  }); //TODO NEED CHEEEECK
                  setCurrentMoveIndex((args.move as MoveModel).index);
                  chessLogic.current.load(args.position);
                  setOptionSquares({});
                });
                socket.current.on("message", (data) => {
                  console.log("On emit message data:");
                  console.log(data);
                  addResponseMessage(data.message);
                });
                socket.current.on("gameover", (data) => {
                  console.log("On emit gameover data:");
                  console.log(data);
                  setIsGameOver(true);
                  setIsGameOverDialog(true);
                  setGameResult(data.result);
                });
                socket.current.on("drawsuggest", () => {
                  console.log("On emit drawsuggest data:");
                  setIsDrawSuggested(true);
                });
                socket.current.on("takebackrequest", () => {
                  console.log("On emit takebackrequest data:");
                  setIsTakebreakRequest(true);
                });
                socket.current.on("takeback", (data: MoveModel) => {
                  console.log("On emit takeback data:");
                  console.log(data);
                  setPosition(data.after as string);
                  setMoves((prevState) => {
                    const prev = [...prevState.slice(0, data.index)];
                    console.log(prev);
                    return prev;
                  }); //TODO NEED CHEEEECK
                  setCurrentMoveIndex(data.index);
                  chessLogic.current.load(data.after as string);
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
            console.log(`Error with aith with cookie, renavigate to homePage`);
            console.error(reason);
            navigation("/", {
              replace: true,
            });
          });
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
    if (
      userSide !== chessLogic.current.turn() ||
      (moves.length !== 0 &&
        currentMoveIndex !== moves[moves.length - 1].index) ||
      isGameOver
    ) {
      console.log(currentMoveIndex);
      return;
    }
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
        setCurrentMoveIndex(
          chessLogic.current.turn() === "b"
            ? chessLogic.current.moveNumber() * 2 - 1
            : chessLogic.current.moveNumber() * 2 - 2,
        );
        const history = chessLogic.current.history({
          verbose: true,
        });
        if (socket.current.connected) {
          // const history = chessLogic.current.history({
          //   verbose: true,
          // });
          socket.current.emit("move", {
            userUuid: contextValue.sessionCredentials?.uuid,
            gameUuid: activeGame?.uuid,
            move: {
              ...history[history.length - 1],
              index:
                chessLogic.current.turn() === "b"
                  ? chessLogic.current.moveNumber() * 2 - 1
                  : chessLogic.current.moveNumber() * 2 - 2,
            },
            message: undefined,
            partyUuid: activeParty?.uuid,
          });
          if (chessLogic.current.isGameOver()) {
            setIsGameOverDialog(true);
            setIsGameOver(true);
            if (chessLogic.current.isCheckmate()) {
              setGameResult(chessLogic.current.turn() === "w" ? "B" : "W");
              socket.current.emit("gameover", {
                userUuid: contextValue.sessionCredentials?.uuid,
                gameUuid: activeGame?.uuid,
                message: chessLogic.current.turn() === "w" ? "B" : "W",
                partyUuid: activeParty?.uuid,
              });
            } else {
              setGameResult("D");
              socket.current.emit("gameover", {
                userUuid: contextValue.sessionCredentials?.uuid,
                gameUuid: activeGame?.uuid,
                message: "D",
                partyUuid: activeParty?.uuid,
              });
            }
          }
        }
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
  const sendMessage = (content: string) => {
    if (socket.current.connected) {
      socket.current.emit("message", {
        userUuid: contextValue.sessionCredentials?.uuid,
        gameUuid: activeGame?.uuid,
        message: content,
        partyUuid: activeParty?.uuid,
      });
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
  return !contextValue.sessionToken ? (
    <ErrorPage />
  ) : (
    <div
      style={{
        margin: "3rem auto",
        maxWidth: "70vh",
        width: "70vw",
      }}
    >
      <h1>Активная игра</h1>
      <h2>{opponent?.login}</h2>
      <Chessboard
        arePiecesDraggable={false}
        animationDuration={200}
        position={position}
        onPieceDragBegin={(piece, sourceSquare) => {
          console.log(sourceSquare);
        }}
        boardOrientation={
          activeGame?.userWUuid === contextValue.sessionCredentials?.uuid
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
      />
      <h2>{contextValue.sessionCredentials?.login}</h2>
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
      <div
        style={{
          //marginTop: "2%",
          top: "125px",
          left: "30px",
          position: "absolute",
          width: "25%",
          height: "100%",
        }}
      >
        <Widget showTimeStamp={false} handleNewUserMessage={sendMessage} />
      </div>
      <div
        style={{
          marginLeft: "10%",
          //marginTop: "2%",
          top: "125px",
          left: "80px",
          position: "absolute",
          width: "15%",
          height: "100%",
        }}
      >
        <h3>{`Шахматная история ${moves.length}`}</h3>
        <div style={{ width: "100%", height: "550px", overflow: "auto" }}>
          {moves.map((value) => {
            return (
              <TextField
                key={value.index}
                defaultValue={
                  value.index + ". " + value.piece + value.from + value.to
                }
                InputProps={{
                  readOnly: true,
                }}
                sx={{ width: "100%" }}
                onClick={() => {
                  setCurrentMoveIndex(value.index);
                  //chessLogic.current.load(value.after as string);
                  setPosition(value.after as string);
                  //setMoveFrom("");
                  //setMoveTo(null);
                  setOptionSquares({
                    [value.from as string]: {
                      background: "rgba(255, 255, 0, 0.4)",
                    },
                    [value.to as string]: {
                      background: "rgba(255, 255, 0, 0.4)",
                    },
                  });
                  //setSuggestedMove([]);
                  // if (socket.current.connected) {
                  //   const history = chessLogic.current.history({
                  //     verbose: true,
                  //   });
                  //   socket.current.emit("position", {
                  //     position: chessLogic.current.fen(),
                  //   });
                  // }
                }}
              ></TextField>
            );
          })}
        </div>
      </div>
      <Button
        sx={{
          width: "200px",
          position: "absolute",
          left: "20px",
          top: "370px",
        }}
        onClick={() => {
          if (!isGameOver && socket.current.connected) {
            socket.current.emit("drawsuggest", {
              userUuid: contextValue.sessionCredentials?.uuid,
              gameUuid: activeGame?.uuid,
              message: "D",
              partyUuid: activeParty?.uuid,
            });
          }
        }}
      >
        Предложить ничью
      </Button>
      <Button
        sx={{
          width: "200px",
          position: "absolute",
          left: "20px",
          top: "420px",
        }}
        onClick={() => {
          setIsSurrender(true);
        }}
      >
        Сдаться
      </Button>
      <Button
        sx={{
          width: "200px",
          position: "absolute",
          left: "20px",
          top: "470px",
        }}
        onClick={() => {
          if (!isGameOver && socket.current.connected) {
            socket.current.emit("takebackrequest", {
              userUuid: contextValue.sessionCredentials?.uuid,
              gameUuid: activeGame?.uuid,
              message: "D",
              partyUuid: activeParty?.uuid,
            });
          }
        }}
      >
        Попросить вернуть ход
      </Button>
      <Button
        sx={{
          width: "200px",
          position: "absolute",
          left: "20px",
          top: "545px",
        }}
        onClick={() => {
          setIsReportContentDialog(true);
        }}
      >
        Пожаловаться
      </Button>
      {isDrawSuggested ? (
        <h3
          style={{
            position: "absolute",
            maxWidth: "250px",
            left: "20px",
            top: "570px",
          }}
        >
          Соперник предлагает ничью
        </h3>
      ) : null}
      {isDrawSuggested ? (
        <Button
          sx={{
            width: "40px",
            height: "40px",
            position: "absolute",
            left: "20px",
            top: "650px",
          }}
          onClick={() => {
            setIsDrawSuggested(false);
            setIsGameOverDialog(true);
            setIsGameOver(true);
            setGameResult("D");
            if (socket.current.connected) {
              socket.current.emit("gameover", {
                userUuid: contextValue.sessionCredentials?.uuid,
                gameUuid: activeGame?.uuid,
                message: "D",
                partyUuid: activeParty?.uuid,
              });
            }
          }}
        >
          <DoneIcon />
        </Button>
      ) : null}
      {isDrawSuggested ? (
        <Button
          sx={{
            width: "40px",
            height: "40px",
            position: "absolute",
            left: "125px",
            top: "650px",
          }}
          onClick={() => {
            setIsDrawSuggested(false);
          }}
        >
          <ClearIcon />
        </Button>
      ) : null}
      {isTakebreakRequest ? (
        <h3
          style={{
            position: "absolute",
            maxWidth: "200px",
            left: "20px",
            top: "570px",
          }}
        >
          Соперник просит вернуть ход
        </h3>
      ) : null}
      {isTakebreakRequest ? (
        <Button
          sx={{
            width: "40px",
            height: "40px",
            position: "absolute",
            left: "20px",
            top: "650px",
          }}
          onClick={() => {
            setIsTakebreakRequest(false);
            if (moves.length < 3 || !socket.current.connected) {
              return;
            }
            if (userSide === chessLogic.current.turn()) {
              setPosition(moves[moves.length - 2].after as string);
              setMoves((prevState) => [
                ...prevState.slice(0, moves.length - 1),
              ]);
              setCurrentMoveIndex(moves[moves.length - 2].index);
              chessLogic.current.load(moves[moves.length - 2].after as string);

              socket.current.emit("takeback", {
                userUuid: contextValue.sessionCredentials?.uuid,
                gameUuid: activeGame?.uuid,
                move: {
                  ...moves[moves.length - 2],
                },
                partyUuid: activeParty?.uuid,
              });
            } else {
              setPosition(moves[moves.length - 3].after as string);
              setMoves((prevState) => [
                ...prevState.slice(0, moves.length - 2),
              ]);
              setCurrentMoveIndex(moves[moves.length - 3].index);
              chessLogic.current.load(moves[moves.length - 3].after as string);
              socket.current.emit("takeback", {
                userUuid: contextValue.sessionCredentials?.uuid,
                gameUuid: activeGame?.uuid,
                move: {
                  ...moves[moves.length - 3],
                },
                partyUuid: activeParty?.uuid,
              });
            }
          }}
        >
          <DoneIcon />
        </Button>
      ) : null}
      {isTakebreakRequest ? (
        <Button
          sx={{
            width: "40px",
            height: "40px",
            position: "absolute",
            left: "125px",
            top: "650px",
          }}
          onClick={() => {
            setIsTakebreakRequest(false);
          }}
        >
          <ClearIcon />
        </Button>
      ) : null}
      <Dialog
        open={isGameOverDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id={"alert-dialog-title"}>Игра завершена</DialogTitle>
        <DialogContent id={"alert-dialog-description"}>
          {gameResult
            ? gameResult === "D"
              ? "Ничья."
              : gameResult === "W"
                ? chessLogic.current.isGameOver()
                  ? "Мат. Победа белых."
                  : "Чёрные сдались. Победа белых."
                : chessLogic.current.isGameOver()
                  ? "Мат. Победа чёрных."
                  : "Белые сдались. Победа чёрных."
            : `Error: gameResult = ${gameResult}`}
        </DialogContent>
        <DialogActions>
          <Button
            variant={"text"}
            color={"success"}
            onClick={() => {
              setIsGameOverDialog(false);
            }}
          >
            Закрыть диалог.
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={isSurrender}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id={"alert-dialog-title"}>Сдаться</DialogTitle>
        <DialogContent id={"alert-dialog-description"}>
          Вы действительно хотите сдаться?
        </DialogContent>
        <DialogActions>
          <Button
            variant={"text"}
            color={"error"}
            onClick={() => {
              setIsSurrender(false);
              setIsGameOverDialog(true);
              setIsGameOver(true);
              setGameResult(userSide === "w" ? "B" : "W");
              if (socket.current.connected) {
                socket.current.emit("gameover", {
                  userUuid: contextValue.sessionCredentials?.uuid,
                  gameUuid: activeGame?.uuid,
                  message: userSide === "w" ? "B" : "W",
                  partyUuid: activeParty?.uuid,
                });
              }
            }}
          >
            Подтвердить
          </Button>
          <Button
            variant={"text"}
            color={"warning"}
            onClick={() => {
              setIsSurrender(false);
            }}
          >
            Отмена
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={isReportContentDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle
          id={"alert-dialog-title"}
        >{`Жалоба на игрока ${opponent?.login || ""}`}</DialogTitle>
        <DialogContent id={"alert-dialog-description"}>
          <div style={{ width: "100%", height: "200px" }}>
            <TextField
              sx={{ marginTop: "5px" }}
              multiline={true}
              size={"medium"}
              fullWidth={true}
              label="Укажите причину жалобы"
              value={reportContent}
              onChange={(e) => {
                setReportContent(e.target.value);
              }}
            />
          </div>
        </DialogContent>
        <DialogActions>
          <Button
            variant={"text"}
            color={"warning"}
            onClick={() => {
              setIsReportContentDialog(false);
            }}
          >
            Отмена
          </Button>
          <Button
            variant={"text"}
            color={"error"}
            onClick={() => {
              setReportContent("");
              setIsReportContentDialog(false);
              if (socket.current.connected) {
                socket.current.emit("report", {
                  userSrcUuid: contextValue.sessionCredentials?.uuid,
                  userDstUuid: opponent?.uuid,
                  gameUuid: activeGame?.uuid,
                  describe: reportContent,
                });
              }
            }}
          >
            Пожаловаться
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};
