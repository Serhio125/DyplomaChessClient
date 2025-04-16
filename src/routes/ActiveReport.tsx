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
import {
  ActiveReportModel,
  ReportUsersModel,
} from "../models/active-report.model";
import { useSnackbar } from "notistack";
export const ActiveReport = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [render, setRender] = useState<boolean>(true);
  const params = useParams();
  const contextValue = useContext(GlobalContext) as TypeGlobalContext;
  const [position, setPosition] = useState<string>("");
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
  const [isBanDialog, setIsBanDialog] = useState<boolean>(false);
  const [isForgiveDialog, setIsForgiveDialog] = useState<boolean>(false);
  const [isReportContentDialog, setIsReportContentDialog] =
    useState<boolean>(false);
  const [reportContent, setReportContent] = useState<string>("");
  const [reportUsers, setReportUsers] = useState<ReportUsersModel>({
    admin: "",
    userDst: "",
    userSrc: "",
  });
  const [report, setReport] = useState<ActiveReportModel>({
    describe: "",
    uuid: "",
    srcUserUuid: "",
    dstUserUuid: "",
    updatedAt: "",
    status: "",
  });
  const chessLogic = useRef(new Chess());
  const navigation = useNavigate();
  useEffect(() => {
    (async () => {
      console.log(params);
      //console.log(document.cookie);
      //console.log(contextValue);
      if (contextValue.sessionCredentials && contextValue.sessionToken) {
        console.log("Context exist, request to activeReport");
        axios.defaults.withCredentials = true;
        axios
          .post("http://localhost:8080/loadActiveReport", {
            token: contextValue.sessionToken,
            userUuid: contextValue.sessionCredentials.uuid,
            reportUuid: params.uuid,
          })
          .then((value) => {
            console.log(value);
            const activeParty = value.data.activeParty as ActivePartyModel;
            const activeGame = value.data.activeGame as ActiveGameModel;
            const messages = (value.data.messages as MessageModel[]).sort(
              (a, b) => (dayjs(a.createdAt).isAfter(b.createdAt) ? 1 : -1),
            );
            deleteMessages(100);
            messages.forEach((value1) => {
              value1.srcUserUuid === value.data.report?.srcUserUuid
                ? addUserMessage(value1.content)
                : addResponseMessage(value1.content);
            });
            const moves = (value.data.partyMoves as MoveModel[]).sort(
              (a, b) => a.index - b.index,
            );
            setCurrentMoveIndex(
              moves.length
                ? (moves.at(moves.length - 1) as MoveModel).index
                : 0,
            );
            setPosition(value.data.activeParty.currentPos);
            setActiveGame(activeGame);
            setActiveParty(activeParty);
            setMoves(moves);
            setReport(value.data.report);
            setReportUsers(value.data.users);
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
              .post("http://localhost:8080/loadActiveReport", {
                token: contextValue.sessionToken,
                userUuid: contextValue.sessionCredentials?.uuid,
                reportUuid: params.uuid,
              })
              .then((value) => {
                console.log(value);
                const activeParty = value.data.activeParty as ActivePartyModel;
                const activeGame = value.data.activeGame as ActiveGameModel;
                const messages = (value.data.messages as MessageModel[]).sort(
                  (a, b) => (dayjs(a.createdAt).isAfter(b.createdAt) ? 1 : -1),
                );
                deleteMessages(100);
                messages.forEach((value1) => {
                  value1.srcUserUuid === value.data.report?.srcUserUuid
                    ? addUserMessage(value1.content)
                    : addResponseMessage(value1.content);
                });
                const moves = (value.data.partyMoves as MoveModel[]).sort(
                  (a, b) => a.index - b.index,
                );
                setCurrentMoveIndex(
                  moves.length
                    ? (moves.at(moves.length - 1) as MoveModel).index
                    : 0,
                );
                setPosition(value.data.activeParty.currentPos);
                setActiveGame(activeGame);
                setActiveParty(activeParty);
                setMoves(moves);
                setReport(value.data.report);
                setReportUsers(value.data.users);
              })
              .catch((reason) => {
                console.log("`ERROR when loading activeGame:");
                console.log(reason);
                console.error(reason);
              });
          })
          .catch((reason) => {
            console.log(`Error with auth with cookie, renavigate to homePage`);
            console.error(reason);
            navigation("/", {
              replace: true,
            });
          });
      }
    })();
    return () => {};
  }, []);

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
  return !contextValue.sessionToken ? (
    <ErrorPage />
  ) : (
    <div
      style={{
        margin: "3rem auto",
        maxWidth: "65vh",
        width: "65vw",
      }}
    >
      <h1>{`Активная жалоба на игрока ${reportUsers.userDst}`}</h1>
      <h2>{reportUsers.userDst}</h2>
      <Chessboard
        arePiecesDraggable={false}
        animationDuration={200}
        position={position}
        boardOrientation={
          //TODO need to think about chessboard oreintation
          activeGame?.userWUuid === report?.srcUserUuid ? "white" : "black"
        }
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
      <h2>{reportUsers.userSrc}</h2>
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
        <Widget showTimeStamp={false} handleNewUserMessage={() => {}} />
      </div>
      <div
        style={{
          marginLeft: "10%",
          //marginTop: "2%",
          top: "125px",
          left: "100px",
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
      <TextField
        sx={{
          width: "200px",
          maxHeight: "200px",
          position: "absolute",
          left: "20px",
          top: "370px",
        }}
        multiline={true}
        fullWidth={true}
        label={"Причина жалобы:"}
        value={report.describe}
        disabled={true}
      />
      <Button
        sx={{
          width: "200px",
          position: "absolute",
          left: "20px",
          top: "450px",
        }}
        color={"success"}
        onClick={() => {
          setIsForgiveDialog(true);
        }}
      >
        Недостаточно доказательств
      </Button>
      <Button
        sx={{
          width: "200px",
          position: "absolute",
          left: "20px",
          top: "530px",
        }}
        color={"error"}
        onClick={() => {
          setIsBanDialog(true);
        }}
      >
        Забанить
      </Button>
      <Dialog
        open={isForgiveDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle
          id={"alert-dialog-title"}
        >{`Жалоба на игрока ${reportUsers.userDst}`}</DialogTitle>
        <DialogContent id={"alert-dialog-description"}>
          Недостаточно оснований для наказания?
        </DialogContent>
        <DialogActions>
          <Button
            variant={"text"}
            color={"warning"}
            onClick={() => {
              setIsForgiveDialog(false);
              //TODO
            }}
          >
            Отменить
          </Button>
          <Button
            variant={"text"}
            color={"success"}
            onClick={() => {
              setIsForgiveDialog(false);
              axios.defaults.withCredentials = true;
              axios
                .post("http://localhost:8080/setReportDecision", {
                  token: contextValue.sessionToken,
                  userUuid: contextValue.sessionCredentials?.uuid,
                  reportUuid: params.uuid,
                  dstUserUuid: report.dstUserUuid,
                  decision: "F",
                })
                .then((value) => {
                  enqueueSnackbar("Решение применено", {
                    variant: "success",
                    autoHideDuration: 3000,
                  });
                  console.log(value);
                  //setRender((prevState) => !prevState);
                })
                .catch((reason) => {
                  enqueueSnackbar(
                    `Ошибка применения решения${typeof reason.response?.data === "string" && (reason.response.data as string).length ? `: ${reason.response.data as string}` : ""}`,
                    {
                      variant: "error",
                      autoHideDuration: 3000,
                    },
                  );
                  console.error(reason);
                });
              //TODO
            }}
          >
            Подтвердить
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={isBanDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle
          id={"alert-dialog-title"}
        >{`Жалоба на игрока ${reportUsers.userDst}`}</DialogTitle>
        <DialogContent id={"alert-dialog-description"}>
          {`Вы действительно хотите забанить пользователя ${reportUsers.userDst}?`}
        </DialogContent>
        <DialogActions>
          <Button
            variant={"text"}
            color={"warning"}
            onClick={() => {
              setIsBanDialog(false);
              //TODO
            }}
          >
            Отменить
          </Button>
          <Button
            variant={"text"}
            color={"error"}
            onClick={() => {
              setIsBanDialog(false);
              axios.defaults.withCredentials = true;
              axios
                .post("http://localhost:8080/setReportDecision", {
                  token: contextValue.sessionToken,
                  userUuid: contextValue.sessionCredentials?.uuid,
                  reportUuid: params.uuid,
                  dstUserUuid: report.dstUserUuid,
                  decision: "B",
                })
                .then((value) => {
                  enqueueSnackbar("Решение применено", {
                    variant: "success",
                    autoHideDuration: 3000,
                  });
                  console.log(value);
                  //setRender((prevState) => !prevState);
                })
                .catch((reason) => {
                  enqueueSnackbar(
                    `Ошибка применения решения${typeof reason.response?.data === "string" && (reason.response.data as string).length ? `: ${reason.response.data as string}` : ""}`,
                    {
                      variant: "error",
                      autoHideDuration: 3000,
                    },
                  );
                  console.error(reason);
                });
              //TODO
            }}
          >
            Подтвердить
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};
