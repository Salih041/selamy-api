export const authEndpoints = {
    '/api/auth/register': {
        post: {
            summary: 'Register a new user',
            tags: ['Authentication'],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['username', 'email', 'password'],
                            properties: {
                                username: {
                                    type: 'string',
                                    example: 'john_doe',
                                    description: '3-20 characters, letters, numbers, underscore only'
                                },
                                email: {
                                    type: 'string',
                                    format: 'email',
                                    example: 'john@example.com'
                                },
                                password: {
                                    type: 'string',
                                    example: 'SecurePass123',
                                    description: 'Min 6, max 72 chars, must contain uppercase, lowercase, number'
                                }
                            }
                        }
                    }
                }
            },
            responses: {
                '201': {
                    description: 'User registered successfully',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    message: { type: 'string', example: 'User created successfully' },
                                    userId: { type: 'string', example: '60d0fe4f5311236168a109ca' }
                                }
                            }
                        }
                    }
                },
                '400': {
                    description: 'Validation error or user exists',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Error' }
                        }
                    }
                },
                '429': {
                    description: 'Too many requests'
                }
            }
        }
    },
    '/api/auth/verify-email': {
        post: {
            summary: 'Verify email with verification code',
            tags: ['Authentication'],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['email', 'code'],
                            properties: {
                                email: { type: 'string', format: 'email' },
                                code: { type: 'string', example: '123456' }
                            }
                        }
                    }
                }
            },
            responses: {
                '200': {
                    description: 'Email verified successfully',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    message: { type: 'string', example: 'Account verified! You can log in!' }
                                }
                            }
                        }
                    }
                },
                '400': { description: 'Invalid or expired code' }
            }
        }
    },
    '/api/auth/login': {
        post: {
            summary: 'Login user',
            tags: ['Authentication'],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['username', 'password'],
                            properties: {
                                username: { type: 'string', example: 'john_doe' },
                                password: { type: 'string', example: 'SecurePass123' }
                            }
                        }
                    }
                }
            },
            responses: {
                '200': {
                    description: 'Login successful',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    token: { type: 'string', description: 'JWT token' },
                                    userID: { type: 'string' },
                                    role: { type: 'string', enum: ['user', 'admin'] }
                                }
                            }
                        }
                    }
                },
                '400': { description: 'Invalid credentials' },
                '403': { description: 'Account not verified or banned' },
                '429': { description: 'Too many login attempts' }
            }
        }
    },
    '/api/auth/forgot-password': {
        post: {
            summary: 'Request password reset code',
            tags: ['Authentication'],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['email'],
                            properties: {
                                email: { type: 'string', format: 'email' }
                            }
                        }
                    }
                }
            },
            responses: {
                '200': { description: 'Reset code sent to email' },
                '429': { description: 'Too many reset requests' }
            }
        }
    },
    '/api/auth/reset-password': {
        post: {
            summary: 'Reset password with code',
            tags: ['Authentication'],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['email', 'code', 'newPassword'],
                            properties: {
                                email: { type: 'string' },
                                code: { type: 'string' },
                                newPassword: { type: 'string' }
                            }
                        }
                    }
                }
            },
            responses: {
                '200': { description: 'Password reset successfully' },
                '400': { description: 'Invalid or expired code' }
            }
        }
    },
    '/api/auth/me': {
        get: {
            summary: 'Get current user info',
            tags: ['Authentication'],
            security: [{ BearerAuth: [] }],
            responses: {
                '200': {
                    description: 'Current user data',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    _id: { type: 'string' },
                                    username: { type: 'string' },
                                    role: { type: 'string' },
                                    profilePicture: { type: 'string' }
                                }
                            }
                        }
                    }
                },
                '401': { description: 'Unauthorized' },
                '404': { description: 'User not found' }
            }
        }
    }
};

export const postEndpoints = {
    '/api/posts': {
        get: {
            summary: 'Get all published posts with pagination',
            tags: ['Posts'],
            parameters: [
                {
                    in: 'query',
                    name: 'page',
                    schema: { type: 'integer', default: 1 }
                },
                {
                    in: 'query',
                    name: 'limit',
                    schema: { type: 'integer', default: 20 }
                }
            ],
            responses: {
                '200': {
                    description: 'List of posts',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    data: {
                                        type: 'array',
                                        items: { $ref: '#/components/schemas/Post' }
                                    },
                                    pagination: {
                                        type: 'object',
                                        properties: {
                                            currentPage: { type: 'integer' },
                                            limit: { type: 'integer' },
                                            totalResults: { type: 'integer' },
                                            totalPages: { type: 'integer' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        post: {
            summary: 'Create new post',
            tags: ['Posts'],
            security: [{ BearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['title', 'content'],
                            properties: {
                                title: {
                                    type: 'string',
                                    example: 'My Amazing Post',
                                    description: 'Max 40 characters'
                                },
                                content: {
                                    type: 'string',
                                    description: '200-80000 characters'
                                },
                                tags: {
                                    type: 'array',
                                    items: { type: 'string' },
                                    example: ['javascript', 'nodejs']
                                },
                                statu: {
                                    type: 'string',
                                    enum: ['published', 'draft'],
                                    default: 'published'
                                }
                            }
                        }
                    }
                }
            },
            responses: {
                '201': {
                    description: 'Post created',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Post' }
                        }
                    }
                },
                '400': { description: 'Validation error' },
                '401': { description: 'Unauthorized' }
            }
        }
    },
    '/api/posts/popular-tags': {
        get: {
            summary: 'Get top 10 popular tags',
            tags: ['Posts'],
            responses: {
                '200': {
                    description: 'List of popular tags',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        _id: { type: 'string' },
                                        count: { type: 'integer' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    '/api/posts/search': {
        get: {
            summary: 'Search posts by title, content, tags, or author',
            tags: ['Posts'],
            parameters: [
                {
                    in: 'query',
                    name: 'q',
                    schema: { type: 'string' },
                    description: 'Search term (max 100 chars)'
                },
                {
                    in: 'query',
                    name: 'tag',
                    schema: { type: 'string' },
                    description: 'Search by tag'
                },
                {
                    in: 'query',
                    name: 'page',
                    schema: { type: 'integer', default: 1 }
                },
                {
                    in: 'query',
                    name: 'limit',
                    schema: { type: 'integer', default: 20 }
                }
            ],
            responses: {
                '200': { description: 'Search results' },
                '400': { description: 'Search term required' }
            }
        }
    },
    '/api/posts/feed': {
        get: {
            summary: 'Get feed from followed users',
            tags: ['Posts'],
            security: [{ BearerAuth: [] }],
            parameters: [
                { in: 'query', name: 'page', schema: { type: 'integer' } },
                { in: 'query', name: 'limit', schema: { type: 'integer' } }
            ],
            responses: {
                '200': { description: 'User\'s feed' },
                '401': { description: 'Unauthorized' }
            }
        }
    },
    '/api/posts/my-liked': {
        get: {
            summary: 'Get liked posts',
            tags: ['Posts'],
            security: [{ BearerAuth: [] }],
            parameters: [
                { in: 'query', name: 'page', schema: { type: 'integer' } },
                { in: 'query', name: 'limit', schema: { type: 'integer' } }
            ],
            responses: {
                '200': { description: 'User\'s liked posts' },
                '401': { description: 'Unauthorized' }
            }
        }
    },
    '/api/posts/my-saved': {
        get: {
            summary: 'Get saved/bookmarked posts',
            tags: ['Posts'],
            security: [{ BearerAuth: [] }],
            parameters: [
                { in: 'query', name: 'page', schema: { type: 'integer' } },
                { in: 'query', name: 'limit', schema: { type: 'integer' } }
            ],
            responses: {
                '200': { description: 'User\'s saved posts' },
                '401': { description: 'Unauthorized' }
            }
        }
    },
    '/api/posts/my-drafts': {
        get: {
            summary: 'Get draft posts',
            tags: ['Posts'],
            security: [{ BearerAuth: [] }],
            parameters: [
                { in: 'query', name: 'page', schema: { type: 'integer' } },
                { in: 'query', name: 'limit', schema: { type: 'integer' } }
            ],
            responses: {
                '200': { description: 'User\'s draft posts' },
                '401': { description: 'Unauthorized' }
            }
        }
    },
    '/api/posts/user/{userId}': {
        get: {
            summary: 'Get posts from a specific user',
            tags: ['Posts'],
            parameters: [
                { in: 'path', name: 'userId', required: true, schema: { type: 'string' } },
                { in: 'query', name: 'page', schema: { type: 'integer' } },
                { in: 'query', name: 'limit', schema: { type: 'integer' } }
            ],
            responses: {
                '200': { description: 'User\'s posts' }
            }
        }
    },
    '/api/posts/{id}': {
        get: {
            summary: 'Get single post by ID or slug',
            tags: ['Posts'],
            parameters: [
                {
                    in: 'path',
                    name: 'id',
                    required: true,
                    schema: { type: 'string' },
                    description: 'Post ID or slug'
                }
            ],
            responses: {
                '200': {
                    description: 'Post details',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Post' }
                        }
                    }
                },
                '403': { description: 'Not authorized to view this post' },
                '404': { description: 'Post not found' }
            }
        },
        put: {
            summary: 'Update post',
            tags: ['Posts'],
            security: [{ BearerAuth: [] }],
            parameters: [
                { in: 'path', name: 'id', required: true, schema: { type: 'string' } }
            ],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                title: { type: 'string' },
                                content: { type: 'string' },
                                tags: { type: 'array', items: { type: 'string' } },
                                statu: { type: 'string', enum: ['published', 'draft'] }
                            }
                        }
                    }
                }
            },
            responses: {
                '200': { description: 'Post updated' },
                '403': { description: 'Not authorized' },
                '404': { description: 'Post not found' }
            }
        },
        delete: {
            summary: 'Delete post',
            tags: ['Posts'],
            security: [{ BearerAuth: [] }],
            parameters: [
                { in: 'path', name: 'id', required: true, schema: { type: 'string' } },
                { in: 'query', name: 'reason', schema: { type: 'string' }, description: 'Reason for deletion (admin only)' }
            ],
            responses: {
                '200': { description: 'Post deleted' },
                '403': { description: 'Not authorized' },
                '404': { description: 'Post not found' }
            }
        }
    },
    '/api/posts/{id}/comment': {
        post: {
            summary: 'Add comment to post',
            tags: ['Comments'],
            security: [{ BearerAuth: [] }],
            parameters: [
                { in: 'path', name: 'id', required: true, schema: { type: 'string' } }
            ],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['text'],
                            properties: {
                                text: {
                                    type: 'string',
                                    example: 'Great post! @username check this out',
                                    description: 'Can include @mentions'
                                }
                            }
                        }
                    }
                }
            },
            responses: {
                '200': { description: 'Comment added' },
                '401': { description: 'Unauthorized' },
                '403': { description: 'Cannot comment on unpublished posts' },
                '404': { description: 'Post not found' }
            }
        }
    },
    '/api/posts/{id}/comment/{commentid}': {
        delete: {
            summary: 'Delete comment',
            tags: ['Comments'],
            security: [{ BearerAuth: [] }],
            parameters: [
                { in: 'path', name: 'id', required: true, schema: { type: 'string' } },
                { in: 'path', name: 'commentid', required: true, schema: { type: 'string' } },
                { in: 'query', name: 'reason', schema: { type: 'string' } }
            ],
            responses: {
                '200': { description: 'Comment deleted' },
                '403': { description: 'Not authorized' },
                '404': { description: 'Comment not found' }
            }
        },
        put: {
            summary: 'Edit comment',
            tags: ['Comments'],
            security: [{ BearerAuth: [] }],
            parameters: [
                { in: 'path', name: 'id', required: true, schema: { type: 'string' } },
                { in: 'path', name: 'commentid', required: true, schema: { type: 'string' } }
            ],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['text'],
                            properties: { text: { type: 'string' } }
                        }
                    }
                }
            },
            responses: {
                '200': { description: 'Comment updated' },
                '403': { description: 'Not authorized' }
            }
        }
    },
    '/api/posts/{id}/comment/{commentid}/like': {
        put: {
            summary: 'Like/unlike comment',
            tags: ['Comments'],
            security: [{ BearerAuth: [] }],
            parameters: [
                { in: 'path', name: 'id', required: true, schema: { type: 'string' } },
                { in: 'path', name: 'commentid', required: true, schema: { type: 'string' } }
            ],
            responses: {
                '200': { description: 'Comment liked/unliked' }
            }
        }
    },
    '/api/posts/{id}/like': {
        put: {
            summary: 'Like/unlike post',
            tags: ['Posts'],
            security: [{ BearerAuth: [] }],
            parameters: [
                { in: 'path', name: 'id', required: true, schema: { type: 'string' } }
            ],
            responses: {
                '200': {
                    description: 'Post liked/unliked',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    message: { type: 'string' },
                                    likeCount: { type: 'integer' },
                                    likes: { type: 'array' }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    '/api/posts/{id}/save': {
        put: {
            summary: 'Save/unsave post',
            tags: ['Posts'],
            security: [{ BearerAuth: [] }],
            parameters: [
                { in: 'path', name: 'id', required: true, schema: { type: 'string' } }
            ],
            responses: {
                '200': { description: 'Post saved/unsaved' }
            }
        }
    },
    '/api/posts/upload-image': {
        post: {
            summary: 'Upload post image',
            tags: ['Posts'],
            security: [{ BearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    'multipart/form-data': {
                        schema: {
                            type: 'object',
                            required: ['image'],
                            properties: {
                                image: { type: 'string', format: 'binary' }
                            }
                        }
                    }
                }
            },
            responses: {
                '200': {
                    description: 'Image uploaded',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: { url: { type: 'string' } }
                            }
                        }
                    }
                }
            }
        }
    }
};

export const userEndpoints = {
    '/api/users': {
        get: {
            summary: 'Get all users (admin only)',
            tags: ['Users'],
            security: [{ BearerAuth: [] }],
            responses: {
                '200': {
                    description: 'List of users',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'array',
                                items: { $ref: '#/components/schemas/User' }
                            }
                        }
                    }
                },
                '403': { description: 'Forbidden - admin access required' }
            }
        }
    },
    '/api/users/{id}': {
        get: {
            summary: 'Get user profile by ID',
            tags: ['Users'],
            parameters: [
                { in: 'path', name: 'id', required: true, schema: { type: 'string' } }
            ],
            responses: {
                '200': {
                    description: 'User profile',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/User' }
                        }
                    }
                },
                '404': { description: 'User not found' }
            }
        },
        delete: {
            summary: 'Delete user account',
            tags: ['Users'],
            security: [{ BearerAuth: [] }],
            parameters: [
                { in: 'path', name: 'id', required: true, schema: { type: 'string' } }
            ],
            responses: {
                '200': { description: 'Account deleted' },
                '403': { description: 'Banned users cannot delete accounts' },
                '404': { description: 'User not found' }
            }
        }
    },
    '/api/users/update/{id}': {
        put: {
            summary: 'Update user profile',
            tags: ['Users'],
            security: [{ BearerAuth: [] }],
            parameters: [
                { in: 'path', name: 'id', required: true, schema: { type: 'string' } }
            ],
            requestBody: {
                required: true,
                content: {
                    'multipart/form-data': {
                        schema: {
                            type: 'object',
                            properties: {
                                displayName: { type: 'string', maxLength: 50 },
                                bio: { type: 'string', maxLength: 140 },
                                profilePicture: { type: 'string', format: 'binary' },
                                socials: {
                                    type: 'string',
                                    description: 'JSON string with x, instagram, github URLs',
                                    example: '{"x":"https://x.com/username","instagram":"https://instagram.com/username","github":"https://github.com/username"}'
                                }
                            }
                        }
                    }
                }
            },
            responses: {
                '200': {
                    description: 'Profile updated',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/User' }
                        }
                    }
                },
                '403': { description: 'Cannot edit other accounts' }
            }
        }
    },
    '/api/users/{id}/follow': {
        put: {
            summary: 'Follow/unfollow user',
            tags: ['Users'],
            security: [{ BearerAuth: [] }],
            parameters: [
                { in: 'path', name: 'id', required: true, schema: { type: 'string' } }
            ],
            responses: {
                '200': {
                    description: 'User followed/unfollowed',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    message: { type: 'string' },
                                    isFollowing: { type: 'boolean' }
                                }
                            }
                        }
                    }
                },
                '400': { description: 'Cannot follow yourself' }
            }
        }
    },
    '/api/users/ban-account/{id}': {
        put: {
            summary: 'Ban user account (admin only)',
            tags: ['Users'],
            security: [{ BearerAuth: [] }],
            parameters: [
                { in: 'path', name: 'id', required: true, schema: { type: 'string' } }
            ],
            responses: {
                '200': { description: 'User banned' },
                '403': { description: 'Cannot ban admin users' },
                '404': { description: 'User not found' }
            }
        }
    }
};

export const notificationEndpoints = {
    '/api/notifications': {
        get: {
            summary: 'Get user notifications',
            tags: ['Notifications'],
            security: [{ BearerAuth: [] }],
            responses: {
                '200': {
                    description: 'List of notifications (max 30)',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'array',
                                items: { $ref: '#/components/schemas/Notification' }
                            }
                        }
                    }
                },
                '401': { description: 'Unauthorized' }
            }
        }
    },
    '/api/notifications/{id}/read': {
        put: {
            summary: 'Mark notification as read',
            tags: ['Notifications'],
            security: [{ BearerAuth: [] }],
            parameters: [
                { in: 'path', name: 'id', required: true, schema: { type: 'string' } }
            ],
            responses: {
                '200': {
                    description: 'Notification marked as read',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Notification' }
                        }
                    }
                },
                '403': { description: 'Unauthorized' },
                '404': { description: 'Notification not found' }
            }
        }
    },
    '/api/notifications/mark-all-read': {
        put: {
            summary: 'Mark all notifications as read',
            tags: ['Notifications'],
            security: [{ BearerAuth: [] }],
            responses: {
                '200': { description: 'All notifications marked as read' }
            }
        }
    }
};

export const reportEndpoints = {
    '/api/report': {
        post: {
            summary: 'Submit a report',
            tags: ['Reports'],
            security: [{ BearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            required: ['target', 'targetType', 'reason'],
                            properties: {
                                target: {
                                    type: 'string',
                                    description: 'ID of reported content/user'
                                },
                                targetType: {
                                    type: 'string',
                                    enum: ['Post', 'Comment', 'User']
                                },
                                targetPost: {
                                    type: 'string',
                                    description: 'Post ID (required for Comment reports)'
                                },
                                reason: {
                                    type: 'string',
                                    example: 'Spam content'
                                },
                                description: {
                                    type: 'string',
                                    maxLength: 300
                                }
                            }
                        }
                    }
                }
            },
            responses: {
                '201': { description: 'Report submitted' },
                '400': { description: 'Missing required fields' },
                '409': { description: 'You already reported this content' },
                '413': { description: 'Description too long' }
            }
        },
        get: {
            summary: 'Get all reports (admin only)',
            tags: ['Reports'],
            security: [{ BearerAuth: [] }],
            responses: {
                '200': {
                    description: 'List of reports',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'array',
                                items: { $ref: '#/components/schemas/Report' }
                            }
                        }
                    }
                },
                '403': { description: 'Forbidden - admin access required' }
            }
        }
    },
    '/api/report/{id}': {
        delete: {
            summary: 'Resolve/delete report (admin only)',
            tags: ['Reports'],
            security: [{ BearerAuth: [] }],
            parameters: [
                { in: 'path', name: 'id', required: true, schema: { type: 'string' } }
            ],
            responses: {
                '200': { description: 'Report resolved/deleted' },
                '403': { description: 'Forbidden - admin access required' }
            }
        }
    }
};