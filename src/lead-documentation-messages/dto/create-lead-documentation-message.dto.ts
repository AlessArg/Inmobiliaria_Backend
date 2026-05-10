import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateLeadDocumentationMessageDto {
    @IsString()
    @IsNotEmpty()
    lead_message: string;

    @IsInt()
    @Min(1)
    id_lead: number;
}
