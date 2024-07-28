interface UploadAttachment {
    id: string;
    size: number;
    width: number | undefined;
    height: number | undefined;
    name: string;
    extension: string;
}

export default UploadAttachment;