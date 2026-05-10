import {
    Controller,
    Get,
    Param,
    Query,
} from '@nestjs/common';
import { ListAuthUsersQueryDto } from './dto/list-auth-users-query.dto';
import { ListFirestoreUsersQueryDto } from './dto/list-firestore-users-query.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get('auth')
    listAuthUsers(@Query() query: ListAuthUsersQueryDto) {
        return this.usersService.listAuthUsers(query.maxResults ?? 20, query.pageToken);
    }

    @Get('auth/:uid')
    getAuthUser(@Param('uid') uid: string) {
        return this.usersService.getAuthUser(uid);
    }

    @Get('firestore')
    listFirestoreUsers(@Query() query: ListFirestoreUsersQueryDto) {
        return this.usersService.listFirestoreUsers(query.limit ?? 20);
    }

    @Get('firestore/:uid')
    getFirestoreUser(@Param('uid') uid: string) {
        return this.usersService.getFirestoreUser(uid);
    }
}
