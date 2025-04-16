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
  CircularProgress,
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
import { useSnackbar } from "notistack";
import Cookies from "js-cookie";
export const GameInvite = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [password, setPassword] = useState<string>("");
  const [login, setLogin] = useState<string>("");
  const [render, setRender] = useState<boolean>(true);
  const params = useParams();
  const contextValue = useContext(GlobalContext) as TypeGlobalContext;
  const navigation = useNavigate();
  const [cookieAuthLoading, setCookieAuthLoading] = useState<boolean>(true);
  useEffect(() => {
    (async () => {
      console.log(params);
      //console.log(document.cookie);
      //console.log(contextValue);

      console.log("Trying request to auth with cookies");
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
          //axios.defaults.withCredentials = true;
          axios
            .post("http://localhost:8080/acceptGameInvite", {
              token: contextValue.sessionToken,
              userUuid: contextValue.sessionCredentials?.uuid,
              inviteUuid: params.uuid,
            })
            .then((value) => {
              console.log(value);
              navigation(`/activeParty/${value.data.gameUuid}`, {
                replace: true,
              });
            })
            .catch((reason) => {
              console.log("`ERROR when loading gameInvite:"); //TODO need to parse error reason
              console.log(reason);
              setCookieAuthLoading(false);
            });
        })
        .catch((reason) => {
          console.log(`Error with aith with cookie, renavigate to homePage`);
          console.error(reason);
          enqueueSnackbar("Необходимо авторизоваться", {
            variant: "success",
            autoHideDuration: 5000,
          });
          setCookieAuthLoading(false);
        });
    })();
  }, []);
  const handleClick = () => {
    Cookies.remove("authToken");
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    // @ts-ignore
    const base64 = btoa(String.fromCharCode.apply(null, data));
    axios.defaults.withCredentials = true;
    axios
      .post("http://localhost:8080/auth", {
        password: base64
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, ""),
        login: login,
      })
      .then((value) => {
        console.log(value);
        enqueueSnackbar("Авторизация успешна", {
          variant: "success",
          autoHideDuration: 3000,
        });
        contextValue.sessionToken = value.data.sessionToken;
        contextValue.sessionCredentials = {
          ...value.data.userData,
        };
        axios
          .post("http://localhost:8080/acceptGameInvite", {
            token: contextValue.sessionToken,
            userUuid: contextValue.sessionCredentials?.uuid,
            inviteUuid: params.uuid,
          })
          .then((value) => {
            console.log(value);
            navigation(`/activeParty/${value.data.gameUuid}`, {
              replace: true,
            });
          })
          .catch((reason) => {
            console.log("`ERROR when loading gameInvite:"); //TODO need to parse error reason
            console.log(reason);
            setCookieAuthLoading(false);
          });
      })
      .catch((reason) => {
        console.error(reason);
        enqueueSnackbar(
          `Ошибка авторизации${typeof reason.response?.data === "string" && (reason.response.data as string).length ? `: ${reason.response.data as string}` : ""}`,
          {
            variant: "error",
            autoHideDuration: 5000,
          },
        );
      });
  };
  return (
    <div
      style={{
        margin: "3rem auto",
        maxWidth: "70vh",
        width: "70vw",
      }}
    >
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
      {cookieAuthLoading ? (
        <CircularProgress content={`Загрузка`}></CircularProgress>
      ) : (
        <Dialog
          open={true}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
        >
          <DialogTitle id={"alert-dialog-title"}>Авторизация</DialogTitle>
          <DialogContent id={"alert-dialog-description"}>
            <nav>
              <ul>
                <li style={{ paddingTop: "15px" }}>
                  <TextField
                    value={login}
                    label="Введите логин"
                    type="text"
                    onChange={(event) => {
                      setLogin(event.target.value);
                    }}
                  />
                </li>
                <li style={{ paddingTop: "15px" }}>
                  <TextField
                    value={password}
                    label="Введите пароль"
                    type="password"
                    onChange={(event) => {
                      setPassword(event.target.value);
                    }}
                  />
                </li>
              </ul>
            </nav>
          </DialogContent>
          <DialogActions>
            <Button
              variant={"text"}
              color={"warning"}
              onClick={() => {
                console.log("Move back to main menu clicked");
                navigation("/", {
                  replace: true,
                });
              }}
            >
              Вернуться в главное меню
            </Button>
            <Button
              variant={"text"}
              color={"success"}
              onClick={() => {
                handleClick();
              }}
            >
              Авторизоваться
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </div>
  );
};
