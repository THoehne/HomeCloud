class WrongNumberOfArgsError(TypeError):

    def __init__(self, *args: object) -> None:
        super().__init__(*args)

class RequestNotExistsError(NameError):

    def __init__(self, *args: object) -> None:
        super().__init__(*args)

class NoSessionError(PermissionError):
    def __init__(self, *args: object) -> None:
        super().__init__(*args)

class InvalidUserId(LookupError):
    def __init__(self, *args: object) -> None:
        super().__init__(*args)

class CommandNotValid(NameError):
    def __init__(self, *args: object) -> None:
        super().__init__(*args)

class FileLocked(ValueError):
    def __init__(self, *args: object) -> None:
        super().__init__(*args)