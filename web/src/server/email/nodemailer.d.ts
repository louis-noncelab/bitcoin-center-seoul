declare module "nodemailer" {
  export interface Transporter {
    sendMail(message: {
      readonly from: string;
      readonly to: string;
      readonly subject: string;
      readonly text: string;
      readonly html?: string;
      readonly replyTo?: string;
    }): Promise<unknown>;
  }

  export function createTransport(options: {
    readonly host: string;
    readonly port: number;
    readonly secure: boolean;
    readonly auth: { readonly user: string; readonly pass: string };
    readonly connectionTimeout: number;
    readonly greetingTimeout: number;
    readonly socketTimeout: number;
    readonly tls: { readonly servername: string };
  }): Transporter;

  const nodemailer: { readonly createTransport: typeof createTransport };
  export default nodemailer;
}
