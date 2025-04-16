export interface ActiveReportModel {
  describe: string;
  uuid: string;
  srcUserUuid: string;
  dstUserUuid: string;
  status: string;
  updatedAt: string;
}

export interface ReportUsersModel {
  admin?: string;
  userDst: string;
  userSrc: string;
}
